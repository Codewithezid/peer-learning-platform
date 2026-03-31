const express = require('express');
const { auth } = require('../../middleware/auth');
const peerController = require('../../controllers/peer.controller');

const router = express.Router();

router.get('/peer/requests', auth, peerController.listPeerRequests);
router.post('/peer/requests', auth, peerController.createPeerRequest);
router.get('/peer/matches', auth, peerController.getPeerMatches);
router.post('/peer/sessions', auth, peerController.createPeerSession);

module.exports = router;
