import {Address, CustomerInfo} from '../common/compoundTypes'
import {
    OrderId,
    OrderLineId,
    ProductCode,
    OrderQuantity,
    Price,
    BillingAmount,
    PromotionCode,
    EmailAddress
} from '../common/simpleTypes'
import {AsyncResult, TResult} from '../fp'
import {
    UnvalidatedAddress,
    UnvalidatedOrder,
    ValidationError,
    PricingError,
    PlaceOrderEvent,
    OrderAcknowledgmentSent
} from './publicTypes'

// Validation
export type CheckProductCodeExists = (pc: ProductCode) => boolean

export type AddressValidationError = 'InvalidFormat' | 'AddressNotFound'

export type CheckedAddress = { tag: 'CheckedAddress'; value: UnvalidatedAddress }

export type CheckAddressExists = (
    ua: UnvalidatedAddress
) => AsyncResult<CheckedAddress, AddressValidationError>

// Validated Order
export type PricingMethod = { tag: 'Standard' } | { tag: 'Promotion'; value: PromotionCode }

export type ValidatedOrderLine = {
    OrderLineId: OrderLineId
    ProductCode: ProductCode
    Quantity: OrderQuantity
}

export type ValidatedOrder = {
    OrderId: OrderId
    CustomerInfo: CustomerInfo
    ShippingAddress: Address
    BillingAddress: Address
    Lines: ValidatedOrderLine[]
    PricingMethod: PricingMethod
}

export type ValidateOrder = (
    checkProduct: CheckProductCodeExists,
    checkAddress: CheckAddressExists,
    uo: UnvalidatedOrder
) => AsyncResult<ValidatedOrder, ValidationError>

// Pricing
export type GetProductPrice = (pc: ProductCode) => Price
export type TryGetProductPrice = (pc: ProductCode) => Price | null
export type GetPricingFunction = (pm: PricingMethod) => GetProductPrice
export type GetStandardPrices = () => GetProductPrice
export type GetPromotionPrices = (pc: PromotionCode) => TryGetProductPrice

// Priced state
export type PricedOrderProductLine = {
    OrderLineId: OrderLineId
    ProductCode: ProductCode
    Quantity: OrderQuantity
    LinePrice: Price
}

export type PricedOrderLine =
    | { tag: 'ProductLine'; value: PricedOrderProductLine }
    | { tag: 'CommentLine'; value: string }

export type PricedOrder = {
    OrderId: OrderId
    CustomerInfo: CustomerInfo
    ShippingAddress: Address
    BillingAddress: Address
    AmountToBill: BillingAmount
    Lines: PricedOrderLine[]
    PricingMethod: PricingMethod
}

export type PriceOrder = (
    getPricingFunction: GetPricingFunction,
    vo: ValidatedOrder
) => TResult<PricedOrder, PricingError>

// Shipping
export type ShippingMethod = 'PostalService' | 'Fedex24' | 'Fedex48' | 'Ups48'

export type ShippingInfo = {
    ShippingMethod: ShippingMethod
    ShippingCost: Price
}

export type PricedOrderWithShippingMethod = {
    ShippingInfo: ShippingInfo
    PricedOrder: PricedOrder
}

export type CalculateShippingCost = (po: PricedOrder) => Price

export type AddShippingInfoToOrder = (
    calc: CalculateShippingCost,
    po: PricedOrder
) => PricedOrderWithShippingMethod

// VIP shipping
export type FreeVipShipping = (pow: PricedOrderWithShippingMethod) => PricedOrderWithShippingMethod

// Acknowledgement
export type HtmlString = { tag: 'HtmlString'; value: string }

export type OrderAcknowledgment = {
    EmailAddress: EmailAddress
    Letter: HtmlString
}

export type CreateOrderAcknowledgmentLetter = (
    pow: PricedOrderWithShippingMethod
) => HtmlString

export type SendResult = 'Sent' | 'NotSent'

export type SendOrderAcknowledgment = (ack: OrderAcknowledgment) => SendResult

export type AcknowledgeOrder = (
    createLetter: CreateOrderAcknowledgmentLetter,
    sendAck: SendOrderAcknowledgment,
    pow: PricedOrderWithShippingMethod
) => OrderAcknowledgmentSent | null

// Create events
export type CreateEvents = (
    po: PricedOrder,
    ack: OrderAcknowledgmentSent | null
) => PlaceOrderEvent[]
