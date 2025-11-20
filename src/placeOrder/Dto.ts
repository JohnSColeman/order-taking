import {Address} from '../common/compoundTypes'
import {
    valueBillingAmount,
    valueEmailAddress,
    valueOrderId,
    valueOrderQuantity,
    valuePrice,
    valueProductCode
} from '../common/simpleTypes'
import {PricedOrderLine} from './internalTypes'
import {
    BillableOrderPlaced,
    PlaceOrderEvent,
    ShippableOrderLine,
    UnvalidatedAddress,
    UnvalidatedCustomerInfo,
    UnvalidatedOrder,
    UnvalidatedOrderLine
} from './publicTypes'

// CustomerInfo DTO
export type CustomerInfoDto = {
    FirstName: string
    LastName: string
    EmailAddress: string
    VipStatus: string
}

export const CustomerInfoDto = {
    toUnvalidatedCustomerInfo(dto: CustomerInfoDto): UnvalidatedCustomerInfo {
        return {
            FirstName: dto.FirstName,
            LastName: dto.LastName,
            EmailAddress: dto.EmailAddress,
            VipStatus: dto.VipStatus
        }
    }
}

// Address DTO
export type AddressDto = {
    AddressLine1: string
    AddressLine2: string | null
    AddressLine3: string | null
    AddressLine4: string | null
    City: string
    ZipCode: string
    State: string
    Country: string
}

export const AddressDto = {
    toUnvalidatedAddress(dto: AddressDto): UnvalidatedAddress {
        return {...dto}
    },
    fromAddress(a: Address): AddressDto {
        return {
            AddressLine1: a.AddressLine1.value,
            AddressLine2: a.AddressLine2 ? a.AddressLine2.value : null,
            AddressLine3: a.AddressLine3 ? a.AddressLine3.value : null,
            AddressLine4: a.AddressLine4 ? a.AddressLine4.value : null,
            City: a.City.value,
            ZipCode: a.ZipCode.value,
            State: a.State.value,
            Country: a.Country.value
        }
    }
}

// Order lines
export type OrderFormLineDto = {
    OrderLineId: string
    ProductCode: string
    Quantity: number
}

export const OrderLineDto = {
    toUnvalidatedOrderLine(dto: OrderFormLineDto): UnvalidatedOrderLine {
        return {...dto}
    }
}

// PricedOrderLine DTO
export type PricedOrderLineDto = {
    OrderLineId: string | null
    ProductCode: string | null
    Quantity: number
    LinePrice: number
    Comment: string
}

export const PricedOrderLineDto = {
    fromDomain(line: PricedOrderLine): PricedOrderLineDto {
        if (line.tag === 'ProductLine') {
            return {
                OrderLineId: line.value.OrderLineId.value,
                ProductCode: line.value.ProductCode.tag === 'Widget' ? line.value.ProductCode.value.value : line.value.ProductCode.value.value,
                Quantity: valueOrderQuantity(line.value.Quantity),
                LinePrice: valuePrice(line.value.LinePrice),
                Comment: ''
            }
        }
        return {OrderLineId: null, ProductCode: null, Quantity: 0, LinePrice: 0, Comment: line.value}
    }
}

// OrderForm DTO
export type OrderFormDto = {
    OrderId: string
    CustomerInfo: CustomerInfoDto
    ShippingAddress: AddressDto
    BillingAddress: AddressDto
    Lines: OrderFormLineDto[]
    PromotionCode: string
}

export const OrderFormDto = {
    toUnvalidatedOrder(dto: OrderFormDto): UnvalidatedOrder {
        return {
            OrderId: dto.OrderId,
            CustomerInfo: CustomerInfoDto.toUnvalidatedCustomerInfo(dto.CustomerInfo),
            ShippingAddress: AddressDto.toUnvalidatedAddress(dto.ShippingAddress),
            BillingAddress: AddressDto.toUnvalidatedAddress(dto.BillingAddress),
            Lines: dto.Lines.map(OrderLineDto.toUnvalidatedOrderLine),
            PromotionCode: dto.PromotionCode
        }
    }
}

// Shippable event DTO
export type ShippableOrderLineDto = {
    ProductCode: string
    Quantity: number
}

export type ShippableOrderPlacedDto = {
    OrderId: string
    ShippingAddress: AddressDto
    ShipmentLines: ShippableOrderLineDto[]
    Pdf: { Name: string; Bytes: Uint8Array }
}

export const ShippableOrderPlacedDto = {
    fromShippableOrderLine(line: ShippableOrderLine): ShippableOrderLineDto {
        return {
            ProductCode: valueProductCode(line.ProductCode),
            Quantity: valueOrderQuantity(line.Quantity)
        }
    }
}

// Billable event DTO
export type BillableOrderPlacedDto = {
    OrderId: string
    BillingAddress: AddressDto
    AmountToBill: number
}

export const BillableOrderPlacedDto = {
    fromDomain(b: BillableOrderPlaced): BillableOrderPlacedDto {
        return {
            OrderId: valueOrderId(b.OrderId),
            BillingAddress: AddressDto.fromAddress(b.BillingAddress),
            AmountToBill: valueBillingAmount(b.AmountToBill)
        }
    }
}

// OrderAcknowledgmentSent DTO
export type OrderAcknowledgmentSentDto = {
    OrderId: string
    EmailAddress: string
}

export const OrderAcknowledgmentSentDto = {
    fromDomain(o: { OrderId: any; EmailAddress: any }): OrderAcknowledgmentSentDto {
        return {OrderId: valueOrderId(o.OrderId), EmailAddress: valueEmailAddress(o.EmailAddress)}
    }
}

// PlaceOrderEvent DTO as discriminated object map
export type PlaceOrderEventDto = Record<string, unknown>

export const PlaceOrderEventDto = {
    fromDomain(e: PlaceOrderEvent): PlaceOrderEventDto {
        switch (e.tag) {
            case 'ShippableOrderPlaced':
                // Minimal shape; full mapping can be added if needed
                return {ShippableOrderPlaced: {OrderId: valueOrderId(e.value.OrderId)}}
            case 'BillableOrderPlaced':
                return {BillableOrderPlaced: BillableOrderPlacedDto.fromDomain(e.value)}
            case 'AcknowledgmentSent':
                return {AcknowledgmentSent: OrderAcknowledgmentSentDto.fromDomain(e.value)}
        }
    }
}

// Error DTO
export type PlaceOrderErrorDto = {
    Code: string
    Message: string
}

export const PlaceOrderErrorDto = {
    fromDomain(err: any): PlaceOrderErrorDto {
        switch (err.tag) {
            case 'Validation':
                return {Code: 'ValidationError', Message: err.value.value}
            case 'Pricing':
                return {Code: 'PricingError', Message: err.value.value}
            case 'RemoteService':
                return {
                    Code: 'RemoteServiceError',
                    Message: `${err.value.Service.Name}: ${err.value.Exception.message}`
                }
            default:
                return {Code: 'Unknown', Message: 'Unknown error'}
        }
    }
}
