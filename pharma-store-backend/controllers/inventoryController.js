const pool = require('../config/db');
const { AppError } = require('../utils/errorHandler');
const xlsx = require('xlsx');
const fs = require('fs');

// Helper function to determine item status
const getItemStatus = (stock, low_stock_threshold) => {
  if (stock === 0) {
    return 'Out of Stock';
  } else if (stock <= low_stock_threshold) {
    return 'Low Stock';
  } else {
    return 'In Stock';
  }
};


// Get all inventory items
exports.getAllItems = async (req, res, next) => {
    try {
        const [items] = await pool.query(`
            SELECT 
                i.id, 
                c.name AS category, 
                i.type, 
                i.name, 
                i.variant_name, 
                i.price, 
                i.stock, 
                i.status,
                i.expiry_date,
                i.low_stock_threshold
            FROM inventory_items i
            JOIN categories c ON i.category_id = c.id
            ORDER BY i.name
        `);

        res.status(200).json({
            status: 'success',
            data: items || []
        });
    } catch (error) {
        next(error);
    }
};

exports.checkInventoryExists = async (req, res, next) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM inventory_items');
        const hasInventory = result[0].count > 0;
        
        res.status(200).json({
            status: 'success',
            data: {
                hasInventory
            }
        });
    } catch (error) {
        next(error);
    }
};


// Get a single inventory item
exports.getItem = async (req, res, next) => {
    try {
        const [item] = await pool.query(`
            SELECT 
                i.id, 
                c.name AS category, 
                i.type, 
                i.name, 
                i.variant_name, 
                i.price, 
                i.stock, 
                i.status,
                i.expiry_date,
                i.low_stock_threshold
            FROM inventory_items i
            JOIN categories c ON i.category_id = c.id
            WHERE i.id = ?
        `, [req.params.id]);

        if (item.length === 0) {
            return next(new AppError('Item not found', 404));
        }

        res.status(200).json({
            status: 'success',
            data: item[0]
        });
    } catch (error) {
        next(error);
    }
};

// Create new inventory item
exports.createItem = async (req, res, next) => {
    try {
        const { category, type, name, variant_name, price, stock, expiry_date } = req.body;
        
        // Get category ID
        const [categoryResult] = await pool.query('SELECT id FROM categories WHERE name = ?', [category]);
        if (categoryResult.length === 0) {
            return next(new AppError('Invalid category', 400));
        }
        
        const category_id = categoryResult[0].id;
        const status = getItemStatus(stock, 5); // Default threshold of 5
        
        const [result] = await pool.query(
            `INSERT INTO inventory_items 
            (category_id, type, name, variant_name, price, stock, status, expiry_date, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [category_id, type, name, variant_name, price, stock, status, expiry_date, req.user.id]
        );
        
        // Log the creation in history
        await pool.query(
            `INSERT INTO inventory_history 
            (item_id, user_id, action, new_value) 
            VALUES (?, ?, 'Create', ?)`,
            [result.insertId, req.user.id, JSON.stringify(req.body)]
        );
        
        res.status(201).json({
            status: 'success',
            data: {
                id: result.insertId,
                category,
                type,
                name,
                variant_name,
                price,
                stock,
                status,
                expiry_date
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update inventory item
exports.updateItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category, type, name, variant_name, price, stock, expiry_date } = req.body;
        
        // Get the current item first for history
        const [currentItem] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
        if (currentItem.length === 0) {
            return next(new AppError('Item not found', 404));
        }
        
        // Get category ID
        const [categoryResult] = await pool.query('SELECT id FROM categories WHERE name = ?', [category]);
        if (categoryResult.length === 0) {
            return next(new AppError('Invalid category', 400));
        }
        
        const category_id = categoryResult[0].id;
        const status = getItemStatus(stock, currentItem[0].low_stock_threshold);
        
        const [result] = await pool.query(
            `UPDATE inventory_items 
            SET category_id = ?, type = ?, name = ?, variant_name = ?, price = ?, stock = ?, status = ?, expiry_date = ?
            WHERE id = ?`,
            [category_id, type, name, variant_name, price, stock, status, expiry_date, id]
        );
        
        if (result.affectedRows === 0) {
            return next(new AppError('Item not found', 404));
        }
        
        // Log the update in history
        await pool.query(
            `INSERT INTO inventory_history 
            (item_id, user_id, action, old_value, new_value) 
            VALUES (?, ?, 'Update', ?, ?)`,
            [id, req.user.id, JSON.stringify(currentItem[0]), JSON.stringify(req.body)]
        );
        
        res.status(200).json({
            status: 'success',
            data: {
                id,
                category,
                type,
                name,
                variant_name,
                price,
                stock,
                status,
                expiry_date
            }
        });
    } catch (error) {
        next(error);
    }
};

// Delete inventory item
exports.deleteItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Get the current item first for history
        const [currentItem] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
        if (currentItem.length === 0) {
            return next(new AppError('Item not found', 404));
        }
        
        const [result] = await pool.query('DELETE FROM inventory_items WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return next(new AppError('Item not found', 404));
        }
        
        // Log the deletion in history
        await pool.query(
            `INSERT INTO inventory_history 
            (item_id, user_id, action, old_value) 
            VALUES (?, ?, 'Delete', ?)`,
            [id, req.user.id, JSON.stringify(currentItem[0])]
        );
        
        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
};

// Import items from Excel
exports.importItems = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // This library handles both xlsx and csv files.
    // The sheet_to_json function will use the first row as headers.
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!Array.isArray(data) || data.length === 0) {
      return next(new AppError('Excel file is empty or invalid', 400));
    }

    const results = [];
    const errors = [];

    // Loop through each row of the Excel data
    for (const item of data) {
      try {
       
        const {
          CATEGORY,
          ITEM_TYPE: type,
          ITEM_NAME: name,
          VARIANT_NAME: variant_name,
          PRICE: price,
          STOCK: stock
        } = item;

     
        const expiry_date = null;

        let category_id;
        // Check if the category already exists.
        let [categoryResult] = await pool.query('SELECT id FROM categories WHERE name = ?', [CATEGORY]);

        if (categoryResult.length === 0) {
          // If not, insert the new category and get its ID.
          [categoryResult] = await pool.query('INSERT INTO categories (name) VALUES (?)', [CATEGORY]);
          category_id = categoryResult.insertId;
        } else {
          // If it exists, get the existing category's ID.
          category_id = categoryResult[0].id;
        }

        // Call the external function to determine the item's status.
        // Note: The low_stock_threshold is defined in your table as 5 by default.
        const low_stock_threshold = 5; 
        const status = getItemStatus(stock, low_stock_threshold);

        // Insert the inventory item into the inventory_items table.
        // Use the new variables derived from the Excel headers.
        const [result] = await pool.query(
          `INSERT INTO inventory_items
           (category_id, type, name, variant_name, price, stock, status, expiry_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [category_id, type, name, variant_name, price, stock, status, expiry_date, req.user.id]
        );

        // Record the import action in the inventory_history table.
        await pool.query(
          `INSERT INTO inventory_history
           (item_id, user_id, action, new_value)
           VALUES (?, ?, 'Create', ?)`,
          [result.insertId, req.user.id, JSON.stringify(item)]
        );

        // Push the successfully imported item details into the results array.
        results.push({
          id: result.insertId,
          ...item,
          status
        });
      } catch (error) {
        // If an error occurs with a specific item, push it to the errors array.
        errors.push({
          item,
          error: error.message
        });
      }
    }

    // Clean up the uploaded file from the server.
    fs.unlinkSync(req.file.path);

    // Send a success response with the results and errors.
    res.status(201).json({
      status: 'success',
      data: {
        imported: results,
        errors
      }
    });

  } catch (error) {
    // Catch any top-level errors and pass them to the error handler.
    next(error);
  }
};

// Get inventory stats for dashboard
exports.getInventoryStats = async (req, res, next) => {
    try {
        // Get total items count
        const [totalItems] = await pool.query('SELECT COUNT(*) as count FROM inventory_items');
        
        // Get low stock items (stock <= low_stock_threshold and > 0)
        const [lowStock] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM inventory_items 
            WHERE stock > 0 AND stock <= low_stock_threshold
        `);
        
        // Get out of stock items
        const [outOfStock] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM inventory_items 
            WHERE stock = 0
        `);
        
        // Get items expiring soon (within 30 days)
        const [expiringSoon] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM inventory_items 
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        `);
        
        // Get recent sales (you would join with your sales table)
        const recentSales = []; // Placeholder
        
        // Get low stock items details
        const [lowStockItems] = await pool.query(`
            SELECT 
                i.id,
                i.name as item,
                c.name as category,
                i.stock,
                i.status
            FROM inventory_items i
            JOIN categories c ON i.category_id = c.id
            WHERE i.stock > 0 AND i.stock <= i.low_stock_threshold
            ORDER BY i.stock ASC
            LIMIT 5
        `);
        
        // Get inventory by category for chart
        const [inventoryByCategory] = await pool.query(`
            SELECT 
                c.name as category,
                COUNT(i.id) as count
            FROM categories c
            LEFT JOIN inventory_items i ON c.id = i.category_id
            GROUP BY c.name
        `);
        
        res.status(200).json({
            status: 'success',
            data: {
                totalItems: totalItems[0].count,
                lowStock: lowStock[0].count,
                outOfStock: outOfStock[0].count,
                expiringSoon: expiringSoon[0].count,
                recentSales,
                lowStockItems,
                inventoryByCategory
            }
        });
    } catch (error) {
        next(error);
    }
};