import dotenv from 'dotenv'
import pg from 'pg';
dotenv.config()

const { Pool } = pg
const pool = new Pool ({
    connectionString: `${process.env.DB_URL}`
});

const initializeDatabase = async () =>{
    console.log('Initializing mlbb database...');
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price INT,
    quantity INT
    );
    `;
    try {
        await pool.query(createTableQuery);
        console.log('The product table is ready to go.');
    } catch (error) {
        console.error('Error initializing database:', error.message);
        throw error;
    }
};

async function addProduct(barcode, name, price, quantity) {
    const query = `
        INSERT INTO product (
            barcode, name, price, quantity
        ) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *`;

        const values = [barcode, name, price, quantity];

        try {
      const res = await pool.query(query, values);
      console.log('Товар успішно додано:', res.rows[0]);
   } catch (err) {
      console.error('Помилка додавання:', err.message);
   }

}

async function getAllProducts() {
   const res = await pool.query('SELECT * FROM product');
   console.table(res.rows);
}

async function productExists(id) {
   const res = await pool.query('SELECT * FROM product WHERE id = $1', [id]);
   return res.rows.length > 0;
}

async function deleteProduct(id) {
   if (isNaN(id) || id <= 0) {
      console.error('Помилка: ID має бути додатним числом');
      return;
   }

   if (!(await productExists(id))) {
      console.error(`Помилка: Товару з ID ${id} не знайдено`);
      return;
   }

   await pool.query('DELETE FROM product WHERE id = $1', [id]);
   console.log(`Товар з ID ${id} було успішно видалено з бази даних.`);
}

////

(async () => {
   try {
      await initializeDatabase();

      switch(process.argv[2]) { 
         case "list": {
            await getAllProducts();
            break;
         }
         case "add": {
            if (process.argv.length < 7) {
               console.log("Usage: node database.js add <barcode> <name> <price> <quantity>");
               console.log("Example: node database.js add 32132312 woda 23 1");
               break;
            }
             await addProduct(
               process.argv[3],
               process.argv[4],
               process.argv[5],
               process.argv[6]
            );
            break;
         }
         case "delete": {
            if (process.argv.length < 4) {
               console.log("Usage: node database.js delete <id>");
               break;
            }
            const id = parseInt(process.argv[3]);
            await deleteProduct(id);
            break;
         }
         case "reset": {
            await pool.query('DROP TABLE IF EXISTS product');
            console.log("Таблицю успішно видалено! Запусти будь-яку команду (наприклад, list), щоб створити нову чисту таблицю.");
            break;
         }
         case "help": {
            console.log("Доступні команди:");
            console.log("node database.js list - показати всі товари");
            console.log("node database.js add <штрих код> <назва> <ціна> <кількість>");
            console.log("node database.js delete <id> - видалити товару");
            console.log("node database.js reset - повністю видалити та скинути таблицю");
            break;
         }
         default: {
            console.log("Usage: node database.js [list|add|delete|reset|help]");
            break;
         }
      }

   } catch (err) {
      console.error("Error:", err.message);
   } finally {
      console.log('Завершення роботи з базою даних...');
      //await pool.query('DROP TABLE heroes');
      process.exit();
   }
})();

