import express, {type Express, Request, Response} from 'express'
import {placeOrderApi} from './placeOrder/api'

const app: Express = express()
app.use(express.json())

app.post('/place-order', async (req: Request, res: Response) => {
    try {
        const httpRes = await placeOrderApi({
            Action: 'PlaceOrder',
            Uri: req.originalUrl,
            Body: JSON.stringify(req.body)
        })
        res.status(httpRes.HttpStatusCode).type('application/json').send(httpRes.Body)
    } catch (e: any) {
        res.status(500).json({error: 'Internal Server Error', message: e?.message})
    }
})

export default app

const PORT = Number(process.env.PORT ?? 3000)

// Only start server when run directly, not when imported for tests
if (require.main?.filename === __filename) {
    app.listen(PORT, () => {
        console.log(`OrderTaking API listening on http://localhost:${PORT}`)
    })
}
