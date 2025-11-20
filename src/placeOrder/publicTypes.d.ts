import {Address} from '../common/compoundTypes'
import {
    OrderId,
    EmailAddress,
    ProductCode,
    OrderQuantity,
    BillingAmount,
    PdfAttachment
} from '../common/simpleTypes'
import {AsyncResult} from '../fp'

// Inputs
export type UnvalidatedCustomerInfo = {
    FirstName: string
    LastName: string
    EmailAddress: string
    VipStatus: string
}

export type UnvalidatedAddress = {
    AddressLine1: string
    AddressLine2: string | null
    AddressLine3: string | null
    AddressLine4: string | null
    City: string
    ZipCode: string
    State: string
    Country: string
}

export type UnvalidatedOrderLine = {
    OrderLineId: string
    ProductCode: string
    Quantity: number
}

export type UnvalidatedOrder = {
    OrderId: string
    CustomerInfo: UnvalidatedCustomerInfo
    ShippingAddress: UnvalidatedAddress
    BillingAddress: UnvalidatedAddress
    Lines: UnvalidatedOrderLine[]
    PromotionCode: string
}

// Success outputs
export type OrderAcknowledgmentSent = {
    OrderId: OrderId
    EmailAddress: EmailAddress
}

export type ShippableOrderLine = {
    ProductCode: ProductCode
    Quantity: OrderQuantity
}

export type ShippableOrderPlaced = {
    OrderId: OrderId
    ShippingAddress: Address
    ShipmentLines: ShippableOrderLine[]
    Pdf: PdfAttachment
}

export type BillableOrderPlaced = {
    OrderId: OrderId
    BillingAddress: Address
    AmountToBill: BillingAmount
}

export type PlaceOrderEvent =
    | { tag: 'ShippableOrderPlaced'; value: ShippableOrderPlaced }
    | { tag: 'BillableOrderPlaced'; value: BillableOrderPlaced }
    | { tag: 'AcknowledgmentSent'; value: OrderAcknowledgmentSent }

// Errors
export type ValidationError = { tag: 'ValidationError'; value: string }
export type PricingError = { tag: 'PricingError'; value: string }

export type ServiceInfo = { Name: string; Endpoint: string }

export type RemoteServiceError = {
    Service: ServiceInfo
    Exception: Error
}

export type PlaceOrderError =
    | { tag: 'Validation'; value: ValidationError }
    | { tag: 'Pricing'; value: PricingError }
    | { tag: 'RemoteService'; value: RemoteServiceError }

// The workflow itself
export type PlaceOrder = (o: UnvalidatedOrder) => AsyncResult<PlaceOrderEvent[], PlaceOrderError>
