import { Address, CustomerInfo, PersonalName } from '../common/compoundTypes'
import {
    createString50,
    createString50Option,
    valueString50,
    createEmailAddress,
    createVipStatus,
    createZipCode,
    createUsStateCode,
    valueUsStateCode,
    createOrderId,
    valueOrderId,
    createOrderLineId,
    createProductCode,
    createOrderQuantity,
    unsafeCreatePrice,
    multiplyPrice,
    sumPrices,
    valueBillingAmount,
    Price
} from '../common/simpleTypes'
import {Left as Err, Right} from 'purify-ts'
import {resultSequence, AsyncResult, Result, resultAp4, resultAp8} from '../fp'
import {
  AcknowledgeOrder,
  AddressValidationError,
  AddShippingInfoToOrder,
  CheckedAddress,
  CreateEvents,
  FreeVipShipping,
  GetPricingFunction,
  GetProductPrice,
  HtmlString,
  OrderAcknowledgment,
  PriceOrder,
  PricedOrder,
  PricedOrderLine,
  PricedOrderProductLine,
  PricingMethod,
  SendResult,
  ValidateOrder,
  ValidatedOrder,
  ValidatedOrderLine
} from './internalTypes'
import { BillableOrderPlaced, PlaceOrderEvent, PricingError, ShippableOrderLine, OrderAcknowledgmentSent, UnvalidatedCustomerInfo, UnvalidatedOrderLine, UnvalidatedOrder, ValidationError, PlaceOrderError } from './publicTypes'
import { createPricingMethod } from './pricing'

// Helpers to map errors
const toValidationError = (msg: string): ValidationError => ({ tag: 'ValidationError', value: msg })
const ValidationErr = (msg: string) => Err<ValidationError>(toValidationError(msg))

// ValidateOrder step
function toCustomerInfo(u: UnvalidatedCustomerInfo): Result<CustomerInfo, ValidationError> {
    return resultAp4(
        createString50('FirstName', u.FirstName),
        createString50('LastName', u.LastName),
        createEmailAddress('EmailAddress', u.EmailAddress),
        createVipStatus('vipStatus', u.VipStatus),
        (firstName, lastName, email, vip) => ({
            Name: {FirstName: firstName, LastName: lastName} as PersonalName,
            EmailAddress: email,
            VipStatus: vip
        }),
        (es: string[]) => es.join(',')
    ).mapLeft(toValidationError)
}

function toAddress(ca: CheckedAddress): Result<Address, ValidationError> {
  const a = ca.value
  return resultAp8(
    createString50('AddressLine1', a.AddressLine1),
    createString50Option('AddressLine2', a.AddressLine2),
    createString50Option('AddressLine3', a.AddressLine3),
    createString50Option('AddressLine4', a.AddressLine4),
    createString50('City', a.City),
    createZipCode('ZipCode', a.ZipCode),
    createUsStateCode('State', a.State),
    createString50('Country', a.Country),
    (line1, line2, line3, line4, city, zip, state, country) => ({
      AddressLine1: line1,
      AddressLine2: line2,
      AddressLine3: line3,
      AddressLine4: line4,
      City: city,
      ZipCode: zip,
      State: state,
      Country: country
    }),
    (es: string[]) => es.join(',')
  ).mapLeft(toValidationError)
}

export function toCheckedAddress(
  checkAddress: (ua: any) => AsyncResult<CheckedAddress, AddressValidationError>,
  address: any
): AsyncResult<CheckedAddress, ValidationError> {
  return checkAddress(address).then((r) =>
    r.mapLeft((e) =>
      e === 'AddressNotFound'
        ? toValidationError('Address not found')
        : toValidationError('Address has bad format')
    )
  )
}

const toOrderId = (s: string) => createOrderId('OrderId', s).mapLeft(toValidationError)
const toOrderLineId = (s: string) => createOrderLineId('OrderLineId', s).mapLeft(toValidationError)

function toProductCode(
  checkProductCodeExists: (pc: any) => boolean,
  code: string
): Result<any, ValidationError> {
  const checkProduct = (pc: any): Result<any, ValidationError> =>
    checkProductCodeExists(pc)
      ? Right(pc)
      : ValidationErr(`Invalid: ${JSON.stringify(pc)}`)

  return createProductCode('ProductCode', code)
    .mapLeft(toValidationError)
    .chain(checkProduct)
}

const toOrderQuantity = (pc: any, qty: number) =>
  createOrderQuantity('OrderQuantity', pc, qty).mapLeft(toValidationError)

function toValidatedOrderLine(
  checkProductExists: (pc: any) => boolean,
  u: UnvalidatedOrderLine
): Result<ValidatedOrderLine, ValidationError> {
  return toOrderLineId(u.OrderLineId)
    .chain((olid) => toProductCode(checkProductExists, u.ProductCode)
      .chain((pc) => toOrderQuantity(pc, u.Quantity)
        .map((q) => ({ OrderLineId: olid, ProductCode: pc, Quantity: q }))
      )
    )
}

export const validateOrder: ValidateOrder = (checkProductCodeExists, checkAddressExists, unvalidatedOrder) => {
  const orderId = toOrderId(unvalidatedOrder.OrderId)
  const customerInfo = toCustomerInfo(unvalidatedOrder.CustomerInfo)

  const checkedShippingA = toCheckedAddress(checkAddressExists, unvalidatedOrder.ShippingAddress)
  const checkedBillingA = toCheckedAddress(checkAddressExists, unvalidatedOrder.BillingAddress)

  return Promise.all([checkedShippingA, checkedBillingA]).then(([shipAR, billAR]) => {
    return shipAR.caseOf({
      Left: (e) => AsyncResult.ofResult(shipAR as Result<any, ValidationError>),
      Right: (shipA) => billAR.caseOf({
        Left: (e) => AsyncResult.ofResult(billAR as Result<any, ValidationError>),
        Right: (billA) => {
          const shippingAddress = toAddress(shipA)
          const billingAddress = toAddress(billA)
          const lines = resultSequence(
            unvalidatedOrder.Lines.map((l) => toValidatedOrderLine(checkProductCodeExists, l))
          )
          const pricingMethod: PricingMethod = createPricingMethod(unvalidatedOrder.PromotionCode)

          const validatedOrder = resultAp4(
            orderId,
            customerInfo,
            shippingAddress,
            billingAddress,
            (orderId, customerInfo, shippingAddress, billingAddress) => (lines: ValidatedOrderLine[]) => ({
              OrderId: orderId,
              CustomerInfo: customerInfo,
              ShippingAddress: shippingAddress,
              BillingAddress: billingAddress,
              Lines: lines,
              PricingMethod: pricingMethod
            } as ValidatedOrder),
            (es: ValidationError[]) => ({ tag: 'ValidationError', value: es.map(e => e.value).join(',') } as ValidationError)
          ).chain(fn => lines.map(fn))

          return AsyncResult.ofResult(validatedOrder)
        }
      })
    })
  })
}

// PriceOrder step
function toPricedOrderLine(getProductPrice: GetProductPrice, v: ValidatedOrderLine): Result<PricedOrderLine, PricingError> {
  const price = getProductPrice(v.ProductCode)
  return multiplyPrice(v.Quantity, price)
    .mapLeft((e) => ({ tag: 'PricingError', value: e } as PricingError))
    .map((linePrice) => ({
      tag: 'ProductLine',
      value: {
        OrderLineId: v.OrderLineId,
        ProductCode: v.ProductCode,
        Quantity: v.Quantity,
        LinePrice: linePrice
      } as PricedOrderProductLine
    }))
}

function addCommentLine(pm: PricingMethod, lines: PricedOrderLine[]): PricedOrderLine[] {
  if (pm.tag === 'Standard') return lines
  const promo = pm.value.value
  return lines.concat([{ tag: 'CommentLine', value: `Applied promotion ${promo}` }])
}

function getLinePrice(line: PricedOrderLine): Price {
  if (line.tag === 'ProductLine') return line.value.LinePrice
  return unsafeCreatePrice(0)
}

export const priceOrder: PriceOrder = (getPricingFunction, validatedOrder) => {
  const getProductPrice = getPricingFunction(validatedOrder.PricingMethod)
  const linesR = resultSequence(validatedOrder.Lines.map((l) => toPricedOrderLine(getProductPrice, l)))
    .map((lines) => addCommentLine(validatedOrder.PricingMethod, lines))

  return linesR.chain((lines) =>
    sumPrices(lines.map(getLinePrice))
      .mapLeft((e) => ({ tag: 'PricingError', value: e } as PricingError))
      .map((amountToBill) => ({
        OrderId: validatedOrder.OrderId,
        CustomerInfo: validatedOrder.CustomerInfo,
        ShippingAddress: validatedOrder.ShippingAddress,
        BillingAddress: validatedOrder.BillingAddress,
        Lines: lines,
        AmountToBill: amountToBill,
        PricingMethod: validatedOrder.PricingMethod
      } as PricedOrder))
  )
}

// Shipping
function classifyAddress(address: Address): 'UsLocalState' | 'UsRemoteState' | 'International' {
  if (valueString50(address.Country) === 'US') {
    const st = valueUsStateCode(address.State)
    return st === 'CA' || st === 'OR' || st === 'AZ' || st === 'NV' ? 'UsLocalState' : 'UsRemoteState'
  }
  return 'International'
}

export const calculateShippingCost = (po: PricedOrder): Price => {
  const cls = classifyAddress(po.ShippingAddress)
  let cost = 20
  if (cls === 'UsLocalState') cost = 5
  else if (cls === 'UsRemoteState') cost = 10
  return unsafeCreatePrice(cost)
}

export const addShippingInfoToOrder: AddShippingInfoToOrder = (calc, pricedOrder) => ({
  PricedOrder: pricedOrder,
  ShippingInfo: {
    ShippingMethod: 'Fedex24',
    ShippingCost: calc(pricedOrder)
  }
})

// VIP shipping
export const freeVipShipping: FreeVipShipping = (order) => {
  const isVip = order.PricedOrder.CustomerInfo.VipStatus === 'VIP'
  if (!isVip) return order
  return {
    ...order,
    ShippingInfo: { ...order.ShippingInfo, ShippingCost: unsafeCreatePrice(0), ShippingMethod: 'Fedex24' }
  }
}

// Acknowledge
export const acknowledgeOrder: AcknowledgeOrder = (createLetter, sendAck, pow) => {
  const pricedOrder = pow.PricedOrder
  const letter: HtmlString = createLetter(pow)
  const acknowledgment: OrderAcknowledgment = { EmailAddress: pricedOrder.CustomerInfo.EmailAddress, Letter: letter }
  if (sendAck(acknowledgment) === 'Sent') {
    const event: OrderAcknowledgmentSent = { OrderId: pricedOrder.OrderId, EmailAddress: pricedOrder.CustomerInfo.EmailAddress }
    return event
  }
  return null
}

// Create events
function makeShipmentLine(line: PricedOrderLine): ShippableOrderLine | null {
  if (line.tag === 'ProductLine') {
    return {
      ProductCode: line.value.ProductCode,
      Quantity: line.value.Quantity
    }
  }
  return null
}

function createShippingEvent(po: PricedOrder) {
  const shipmentLines = po.Lines.map(makeShipmentLine).filter((x): x is ShippableOrderLine => x !== null)
  const orderIdStr = valueOrderId(po.OrderId)
  return {
    OrderId: po.OrderId,
    ShippingAddress: po.ShippingAddress,
    ShipmentLines: shipmentLines,
    Pdf: { Name: `Order${orderIdStr}.pdf`, Bytes: new Uint8Array() }
  }
}

function createBillingEvent(po: PricedOrder): BillableOrderPlaced | null {
  const amount = valueBillingAmount(po.AmountToBill)
  if (amount > 0) {
    return { OrderId: po.OrderId, BillingAddress: po.BillingAddress, AmountToBill: po.AmountToBill }
  }
  return null
}

function listOfOption<T>(opt: T | null): T[] { return opt == null ? [] : [opt] }

export const createEvents: CreateEvents = (pricedOrder, acknowledgmentEventOpt) => {
  const acknowledgmentEvents: PlaceOrderEvent[] = listOfOption(acknowledgmentEventOpt).map((ack) => ({ tag: 'AcknowledgmentSent', value: { OrderId: ack.OrderId, EmailAddress: ack.EmailAddress } }))
  const shippingEvents: PlaceOrderEvent[] = [({ tag: 'ShippableOrderPlaced', value: createShippingEvent(pricedOrder) })]
  const billingEvents: PlaceOrderEvent[] = listOfOption(createBillingEvent(pricedOrder)).map((b) => ({ tag: 'BillableOrderPlaced', value: b }))
  return [...acknowledgmentEvents, ...shippingEvents, ...billingEvents]
}

// Overall workflow
export function placeOrder(
  checkProductExists: (pc: any) => boolean,
  checkAddressExists: any,
  getPricingFunction: GetPricingFunction,
  calculateShippingCost: (po: PricedOrder) => Price,
  createOrderAcknowledgmentLetter: (pow: any) => HtmlString,
  sendOrderAcknowledgment: (ack: OrderAcknowledgment) => SendResult
) {
  return (unvalidatedOrder: UnvalidatedOrder): AsyncResult<PlaceOrderEvent[], PlaceOrderError> => {
    return validateOrder(checkProductExists, checkAddressExists, unvalidatedOrder)
      .then((vr) =>
        vr.mapLeft((e) => ({ tag: 'Validation', value: e }) as PlaceOrderError)
      )
      .then((vr2) => {
        return vr2.caseOf({
          Left: (e) => vr2 as any,
          Right: (validatedOrder) => {
            const pricedOrder = priceOrder(getPricingFunction, validatedOrder)
              .mapLeft((e) => ({ tag: 'Pricing', value: e }) as PlaceOrderError)
            return pricedOrder.caseOf({
              Left: (e) => pricedOrder as any,
              Right: (pricedOrder) => {
                const pricedOrderWithShipping = freeVipShipping(addShippingInfoToOrder(calculateShippingCost, pricedOrder))
                const ackOpt = acknowledgeOrder(createOrderAcknowledgmentLetter, sendOrderAcknowledgment, pricedOrderWithShipping)
                const events = createEvents(pricedOrder, ackOpt)
                return Right(events)
              }
            })
          }
        })
      })
  }
}
