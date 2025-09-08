import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { ExpenseCategory } from "../enum/ExpenseCategory";

@Entity()
export class Expense {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("decimal")
  amount!: number;

  @Column({
    type: "enum",
    enum: ExpenseCategory,
    default: ExpenseCategory.OTHER,
  })
  category!: ExpenseCategory;

  @Column({ nullable: true })
  description!: string;

  @Column()
  userId!: number;

  @Column()
  date!: string;

  @ManyToOne(() => User, (user) => user.expenses)
  @JoinColumn({ name: "userId" }) 
  user!: User;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
