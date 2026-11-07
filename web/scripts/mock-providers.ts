// @ts-nocheck
// A pretend Razorpay and Shiprocket for testing the shop without real accounts or real money.
// The sandbox site (npm run dev:sandbox) is pointed at this; check-orders.ts starts it for you.
import http from 'node:http'

export const MOCK_PORT = 4010
export const KEY_ID = 'rzp_test_sandbox'
export const KEY_SECRET = 'sandbox_secret'
export const HOOK_SECRET = 'sandbox_hook'
export const SR_TOKEN = 'sandbox_token'

export function startMock(port = MOCK_PORT) {
  const state = { razorpayOrders: [] as any[], shiprocketOrders: [] as any[], assigned: [] as any[], logins: 0 }
  const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      const url = new URL(req.url, `http://localhost:${port}`)
      let body: any = {}
      try { body = raw ? JSON.parse(raw) : {} } catch { /* empty */ }

      if (url.pathname === '/rzp/orders' && req.method === 'POST') {
        const want = 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')
        if (req.headers.authorization !== want) return send(res, 401, { error: { description: 'Authentication failed' } })
        if (body.amount === 666) return send(res, 400, { error: { description: 'Amount is not allowed' } })
        const o = { id: `order_MOCK${state.razorpayOrders.length + 1}`, amount: body.amount, currency: body.currency, receipt: body.receipt, status: 'created' }
        state.razorpayOrders.push(o)
        return send(res, 200, o)
      }
      if (url.pathname === '/sr/auth/login') {
        state.logins++
        return body.email === 'api@example.test' && body.password === 'sandbox' ? send(res, 200, { token: 'mock-token' }) : send(res, 403, { message: 'Invalid email or password' })
      }
      if (req.headers.authorization !== 'Bearer mock-token') return send(res, 401, { message: 'Unauthorized' })
      if (url.pathname === '/sr/courier/serviceability/') {
        const pin = url.searchParams.get('delivery_postcode')
        const cod = url.searchParams.get('cod') === '1'
        if (pin === '999999' || (pin === '700099' && cod)) return send(res, 404, { message: 'No courier serviceability for the entered pickup/delivery postcode', status: 404 })
        return send(res, 200, { status: 200, data: { recommended_courier_company_id: 10, available_courier_companies: [
          { courier_company_id: 10, courier_name: 'MockExpress', cod: 1, estimated_delivery_days: '4', rate: 62 },
          { courier_company_id: 11, courier_name: 'MockPost', cod: 0, estimated_delivery_days: '6', rate: 48 },
        ] } })
      }
      if (url.pathname === '/sr/orders/create/adhoc' && req.method === 'POST') {
        if (body.order_id === 'FORCE_FAIL') return send(res, 422, { message: 'Wrong pickup location' })
        state.shiprocketOrders.push(body)
        const n = state.shiprocketOrders.length
        return send(res, 200, { order_id: 5000 + n, shipment_id: 7000 + n, status: 'NEW' })
      }
      if (url.pathname === '/sr/courier/assign/awb' && req.method === 'POST') {
        state.assigned.push(body)
        return send(res, 200, { awb_assign_status: 1, response: { data: { awb_code: `AWB${body.shipment_id}`, courier_name: body.courier_id === 10 ? 'MockExpress' : 'MockPost' } } })
      }
      send(res, 404, { message: 'not found' })
    })
  })
  return new Promise<{ state: typeof state; close: () => Promise<void> }>((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, () => resolve({ state, close: () => new Promise((r) => server.close(() => r())) }))
  })
}

// Run on its own: npx tsx scripts/mock-providers.ts
if (process.argv[1]?.endsWith('mock-providers.ts')) startMock().then(() => console.log(`Pretend Razorpay and Shiprocket listening on http://localhost:${MOCK_PORT}`))
