import test from 'node:test'
import assert from 'node:assert/strict'

import {placeOrder} from '../placeOrder/implementation'
import {getPricingFunction} from '../placeOrder/pricing'
import {unsafeCreatePrice} from '../common/simpleTypes'
import {AsyncResult, throwOnLeft} from '../fp'

test('placeOrder returns events for a valid order', async () => {
    const checkProductExists = (_: any) => true

    const checkAddressExists = async (addr: any) => AsyncResult.retn({tag: 'CheckedAddress', value: addr})

    const getStandardPrices = () => (_: any) => unsafeCreatePrice(10)
    const getPromotionPrices = (_: any) => (_: any) => null
    const getPricingFunc = getPricingFunction(getStandardPrices, getPromotionPrices)
    const calculateShippingCost = (_: any) => unsafeCreatePrice(5)
    const createOrderAcknowledgmentLetter = (_: any): { tag: 'HtmlString'; value: string } => ({
        tag: 'HtmlString',
        value: 'hi'
    })
    const sendOrderAcknowledgment = (_: any) => 'Sent' as const

    const workflow = placeOrder(
        checkProductExists,
        checkAddressExists,
        getPricingFunc,
        calculateShippingCost,
        createOrderAcknowledgmentLetter,
        sendOrderAcknowledgment
    )

    const order = {
        OrderId: 'O1',
        CustomerInfo: {FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com', VipStatus: 'VIP'},
        ShippingAddress: {
            AddressLine1: '1',
            AddressLine2: null,
            AddressLine3: null,
            AddressLine4: null,
            City: 'C',
            ZipCode: '12345',
            State: 'CA',
            Country: 'US'
        },
        BillingAddress: {
            AddressLine1: '1',
            AddressLine2: null,
            AddressLine3: null,
            AddressLine4: null,
            City: 'C',
            ZipCode: '12345',
            State: 'CA',
            Country: 'US'
        },
        Lines: [{OrderLineId: 'L1', ProductCode: 'W1234', Quantity: 2}],
        PromotionCode: ''
    }

    const result = await workflow(order)
    assert.equal(result.isRight(), true, 'Expected success')
    const events = result.caseOf({
        Right: (evts) => evts,
        Left: throwOnLeft
    })
    assert.ok(Array.isArray(events) && events.length > 0)

    // Deep check: verify exactly 3 events
    assert.equal(events.length, 3, 'Expected exactly 3 events')

    // Deep check: Event 0 should be AcknowledgmentSent
    assert.equal(events[0].tag, 'AcknowledgmentSent', 'Event 0 should be AcknowledgmentSent')
    assert.ok('OrderId' in events[0].value, 'AcknowledgmentSent should have OrderId')
    assert.ok('EmailAddress' in events[0].value, 'AcknowledgmentSent should have EmailAddress')

    // Deep check: Event 1 should be ShippableOrderPlaced
    assert.equal(events[1].tag, 'ShippableOrderPlaced', 'Event 1 should be ShippableOrderPlaced')
    assert.ok('OrderId' in events[1].value, 'ShippableOrderPlaced should have OrderId')
    assert.ok('ShippingAddress' in events[1].value, 'ShippableOrderPlaced should have ShippingAddress')
    assert.ok('ShipmentLines' in events[1].value, 'ShippableOrderPlaced should have ShipmentLines')
    assert.ok('Pdf' in events[1].value, 'ShippableOrderPlaced should have Pdf')

    // Deep check: Event 2 should be BillableOrderPlaced
    assert.equal(events[2].tag, 'BillableOrderPlaced', 'Event 2 should be BillableOrderPlaced')
    assert.ok('OrderId' in events[2].value, 'BillableOrderPlaced should have OrderId')
    assert.ok('BillingAddress' in events[2].value, 'BillableOrderPlaced should have BillingAddress')
    assert.ok('AmountToBill' in events[2].value, 'BillableOrderPlaced should have AmountToBill')
})
