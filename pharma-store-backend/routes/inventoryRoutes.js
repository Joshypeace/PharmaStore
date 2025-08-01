const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const authController = require('../controllers/authController');

const router = express.Router();


router.use(authController.protect);

router.route('/')
    .get(inventoryController.getAllItems)
    .post(inventoryController.createItem);

router.route('/:id')
    .get(inventoryController.getItem)
    .patch(inventoryController.updateItem)
    .delete(inventoryController.deleteItem);


router.post('/import', inventoryController.importItems);

router.get('/stats/dashboard', inventoryController.getInventoryStats);
router.get('/exists',inventoryController.checkInventoryExists);

module.exports = router;