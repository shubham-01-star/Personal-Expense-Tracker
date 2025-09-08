import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./models/User";
import { Expense } from "./models/Expense";
import { RecurringExpense } from "./models/recurring_expense";
import { CategoryBudget } from "./models/CategoryBudget_model";
import * as dotenv from "dotenv";


dotenv.config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root@123",
  database: process.env.DB_NAME || "expense-tracker",
  synchronize: false,
  logging: false,
  entities: [User, Expense, RecurringExpense, CategoryBudget],
});
