import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Expense } from "./Expense";
import { RecurringExpense } from "./recurring_expense";
import { collectFlows } from "motia";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: "decimal", nullable: true })
  monthly_budget?: number;

  @OneToMany(() => RecurringExpense, (recurringExpense) => recurringExpense.user)
  
  recurringExpenses!: RecurringExpense[];

  @OneToMany(() => Expense, (expense) => expense.user)
  expenses!: Expense[];

  @Column({ type: 'boolean', default: true })
  isRegistered!: boolean

  
}
