import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { ExpenseCategory } from "../enum/ExpenseCategory";



@Entity()
export class CategoryBudget {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    userId!: number;
    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column({ type: "enum", enum: ExpenseCategory })
    name!: ExpenseCategory;

    @Column({ type: "int", default: 0 })
    limit!: number;

    @Column({ type: "int", default: 0 })
    spent!: number;
}
