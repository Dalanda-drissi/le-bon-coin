const path = require('path')
const db = require(`${path.dirname(__filename)}/../db.json`)

const FAILURE_RATE = Number(process.env.FAILURE_RATE) || 0

module.exports = (req, res, next) => {
  if (FAILURE_RATE > 0 && Math.random() < FAILURE_RATE) {
    res.status(503).json({ error: 'Service Unavailable' })
    return
  }

  if (/conversations/.test(req.url) && req.method === 'GET') {
    const userId = req.query?.senderId
    const result = db?.conversations?.filter(
      conv => conv.senderId == userId || conv.recipientId == userId
    )

    res.status(200).json(result)
    return
  }

  next()
}
