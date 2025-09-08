import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { RecurringFrequency, RecurringStatus } from "../enum/Recurring_enum";

@Entity()
export class RecurringExpense {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    title!: string;

    @Column("decimal", { precision: 10, scale: 2 })
    amount!: number;

    @Column({
        type: "enum",
        enum: RecurringFrequency,
    })
    frequency!: RecurringFrequency;

    @Column({ type: "date" })
    startDate!: Date;

    @Column({ type: "date", nullable: true })
    endDate!: Date | null;

    @Column({
        type: "enum",
        enum: RecurringStatus,
        default: RecurringStatus.ACTIVE,
    })
    status!: RecurringStatus;

    @Column()
    userId!: number;

    @ManyToOne(() => User, (user) => user.recurringExpenses)
    @JoinColumn({ name: "userId" })
    user!: User;
}
