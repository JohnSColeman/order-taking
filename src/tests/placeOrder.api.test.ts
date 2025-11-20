import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../index'

test('POST /place-order returns events for valid order', async () => {
    const orderForm = {
        OrderId: 'O1',
        CustomerInfo: {
            FirstName: 'John',
            LastName: 'Doe',
            EmailAddress: 'john@example.com',
            VipStatus: 'VIP'
        },
        ShippingAddress: {
            AddressLine1: '123 Main St',
            AddressLine2: null,
            AddressLine3: null,
            AddressLine4: null,
            City: 'Los Angeles',
            ZipCode: '90001',
            State: 'CA',
            Country: 'US'
        },
        BillingAddress: {
            AddressLine1: '123 Main St',
            AddressLine2: null,
            AddressLine3: null,
            AddressLine4: null,
            City: 'Los Angeles',
            ZipCode: '90001',
            State: 'CA',
            Country: 'US'
        },
        Lines: [
            {
                OrderLineId: 'L1',
                ProductCode: 'W1234',
                Quantity: 2
            }
        ],
        PromotionCode: ''
    }

    const response = await request(app)
        .post('/place-order')
        .send(orderForm)
        .expect(200)
        .expect('Content-Type', /application\/json/)

    assert.ok(Array.isArray(response.body), 'Response should be an array')
    assert.ok(response.body.length > 0, 'Should return at least one event')
})

test('POST /place-order returns 401 for invalid order', async () => {
    const invalidOrder = {
        OrderId: '',
        CustomerInfo: {
            FirstName: '',
            LastName: '',
            EmailAddress: 'invalid-email',
            VipStatus: 'Invalid'
        },
        ShippingAddress: {
            AddressLine1: '',
            AddressLine2: null,
            AddressLine3: null,
            AddressLine4: null,
            City: '',
            ZipCode: 'invalid',
            State: 'XX',
            Country: ''
        },
        BillingAddress: {
            AddressLine1: '',
            AddressLine2: null,
            AddressLine3: null,
            AddressLine4: null,
            City: '',
            ZipCode: 'invalid',
            State: 'XX',
            Country: ''
        },
        Lines: [],
        PromotionCode: ''
    }

    const response = await request(app)
        .post('/place-order')
        .send(invalidOrder)
        .expect(401)
        .expect('Content-Type', /application\/json/)

    assert.ok(response.body.Code, 'Should have error code')
    assert.ok(response.body.Message, 'Should have error message')
})

