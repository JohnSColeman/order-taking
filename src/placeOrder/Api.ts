import {getPricingFunction} from './pricing'
import {calculateShippingCost, placeOrder} from './implementation'
import {unsafeCreatePrice} from '../common/simpleTypes'
import {OrderFormDto, PlaceOrderErrorDto, PlaceOrderEventDto} from './dto'
import {AsyncResult} from '../fp'

export type JsonString = string

export type HttpRequest = {
    Action: string
    Uri: string
    Body: JsonString
}

export type HttpResponse = {
    HttpStatusCode: number
    Body: JsonString
}

export type PlaceOrderApi = (req: HttpRequest) => Promise<HttpResponse>

// Dummy dependencies
const checkProductExists = (_: any) => true

const checkAddressExists = (unvalidatedAddress: any) =>
    AsyncResult.retn({tag: 'CheckedAddress', value: unvalidatedAddress})

const getStandardPrices = () => (productCode: any) => unsafeCreatePrice(10)

const getPromotionPrices = (_: any) => (productCode: any) => null as any

const getPricingFunc = getPricingFunction(getStandardPrices, getPromotionPrices)

const createOrderAcknowledgmentLetter: (pow: any) => {
    tag: 'HtmlString';
    value: string
} = (_: any) => ({tag: 'HtmlString', value: 'some text'})

const sendOrderAcknowledgment = (_: any) => 'Sent' as const

export const placeOrderApi: PlaceOrderApi = async (request) => {
    const orderFormJson = request.Body
    const orderForm = JSON.parse(orderFormJson)
    const unvalidatedOrder = OrderFormDto.toUnvalidatedOrder(orderForm)

    return placeOrder(
        checkProductExists,
        checkAddressExists,
        getPricingFunc,
        calculateShippingCost,
        createOrderAcknowledgmentLetter,
        sendOrderAcknowledgment
    )(unvalidatedOrder)
        .then(result =>
            result.caseOf({
                Right: (events) => {
                    const dtos = events.map(PlaceOrderEventDto.fromDomain)
                    return {HttpStatusCode: 200, Body: JSON.stringify(dtos)}
                },
                Left: (error) => {
                    const dto = PlaceOrderErrorDto.fromDomain(error)
                    return {HttpStatusCode: 401, Body: JSON.stringify(dto)}
                }
            })
        )
}
