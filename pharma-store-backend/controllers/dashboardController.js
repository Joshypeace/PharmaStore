const pool = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get today's sales
    const [todaySales] = await pool.query(`
      SELECT SUM(total_amount) as total 
      FROM sales 
      WHERE DATE(sale_date) = CURDATE()
    `);

    // Get yesterday's sales for comparison
    const [yesterdaySales] = await pool.query(`
      SELECT SUM(total_amount) as total 
      FROM sales 
      WHERE DATE(sale_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
    `);

    // Get inventory counts
    const [inventoryStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN quantity > 0 AND quantity <= 10 THEN 1 ELSE 0 END) as low_stock
      FROM medicines
    `);

    // Get expiring soon medicines (within 30 days)
    const [expiringSoon] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM medicines 
      WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    `);

    // Get weekly sales data
    const [weeklySales] = await pool.query(`
      SELECT 
        DAYNAME(sale_date) as day,
        SUM(total_amount) as total
      FROM sales
      WHERE sale_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE()
      GROUP BY DAYNAME(sale_date)
      ORDER BY sale_date
    `);

    // Get inventory by category
    const [inventoryByCategory] = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM medicines
      GROUP BY category
      LIMIT 5
    `);

    // Get recent sales
    const [recentSales] = await pool.query(`
      SELECT 
        m.name as item,
        si.quantity,
        si.total_price as amount,
        DATE_FORMAT(s.sale_date, '%h:%i %p') as time
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      JOIN sales s ON si.sale_id = s.id
      ORDER BY s.sale_date DESC
      LIMIT 5
    `);

    // Get low stock items
    const [lowStockItems] = await pool.query(`
      SELECT 
        name as item,
        category,
        quantity as stock,
        CASE 
          WHEN quantity <= 0 THEN 'Out of Stock'
          WHEN quantity <= 10 THEN 'Low Stock'
        END as status
      FROM medicines
      WHERE quantity <= 10
      ORDER BY quantity ASC
      LIMIT 5
    `);

    res.status(200).json({
      status: 'success',
      data: {
        todaySales: todaySales[0].total || 0,
        yesterdaySales: yesterdaySales[0].total || 0,
        totalItems: inventoryStats[0].total_items,
        outOfStock: inventoryStats[0].out_of_stock,
        lowStock: inventoryStats[0].low_stock,
        expiringSoon: expiringSoon[0].count,
        weeklySales,
        inventoryByCategory,
        recentSales,
        lowStockItems
      }
    });
  } catch (error) {
    next(error);
  }
};