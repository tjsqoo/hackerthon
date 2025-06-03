const express = require('express');
const router = express.Router();

/**
 * @route POST /api/calendar/test
 * @desc description
 */
router.post('/test', async (req, res) => {
    res.status(200).json({ message: 'test' });
});

module.exports = router;