import { ApiRouteHandler, ApiResponse } from "motia";
import { ExpenseCategory } from "../enum/ExpenseCategory";

declare module "motia" {
  interface Handlers {
    // DB test
    "db-test": ApiRouteHandler<
      Record<string, never>,
      ApiResponse<200, { message: string }>
    >;

    // Signup
    "signup": ApiRouteHandler<
      {
        name: string;
        email: string;
        password: string;
        monthly_budget?: number;
      },
      ApiResponse<
        200 | 400 | 500,
        {
          token?: string;
          user?: {
            id: number;
            name: string;
            email: string;
          };
          message?: string;
          error?: string;
        }
      >,
      {
        emits: {
          "user.signedup": {
            id: number;
            name: string;
            email: string;
          };
          "notification": {
            templateId: string;
            email: string;
            templateData: Record<string, any>;
          };
        };
      }
    >;

    //verifyOtp
    "verifyOtp": ApiRouteHandler<
      {
        email: string;
        otp: string;
      },
      ApiResponse<
        200 | 400 | 500,
        { message?: string; error?: string }
      >,
      {
        emits: {
          "user.signedup": {
            id: number;
            name: string;
            email: string;
          };
          "notification": {
            templateId: string;
            email: string;
            templateData: Record<string, any>;
          };
        };
      }
    >;



    // Login
    "login": ApiRouteHandler<
      { email: string; password: string },
      ApiResponse<
        200 | 400 | 500,
        {
          token?: string;
          user?: { id: number; name: string; email: string };
          message?: string;
          error?: string;
        }
      >
    >;

    // Expense add
    "expense-add": ApiRouteHandler<
      { userId: number; amount: number; category: string; description?: string, date: string },
      ApiResponse<
        200 | 400 | 500,
        { id?: number; amount?: number; category?: string; date?: string; message?: string; error?: string }
      >
    >;

    // Expense get (new)
    "expense-get": ApiRouteHandler<
      { userId: number },
      ApiResponse<
        200 | 400 | 500,
        {
          expenses?: {
            id: number;
            amount: number;
            category: string;
            description: string | null;
            createdAt: string;
          }[];
          totalSpentThisMonth?: { total: string | null };
          recurringMonthly?: { total: string | null };
          categoriesByTotals?: Record<string, number>;
          recurringExpenses?: any[];
          budgetRemaining?: number;
          message?: string;
          error?: string;
        }
      >
    >;


    "expense-history": ApiRouteHandler<
      {
        userId: number;
        category?: string;
        startDate?: string;
        endDate?: string;
      },
      ApiResponse<
        200 | 400 | 500,
        {
          expenses?: {
            id: number;
            date: string;
            category: string;
            description: string | null;
            amount: number;
          }[];
          message?: string;
          error?: string;
        }
      >
    >;


    // ----------------------
    // Budget Management APIs
    // ----------------------

    // Get overall & category budgets
    "budget-get": ApiRouteHandler<
      { userId: number },
      ApiResponse<
        200 | 400 | 500,
        {
          overallBudget?: {
            amount: number;
            spent: number;
            remaining: number;
          };
          categories?: {
            id: number;
            name: string;
            spent: number;
            limit: number;
          }[];
          message?: string;
          error?: string;
        }
      >
    >;

    // Update overall budget
    "budget-overall-update": ApiRouteHandler<
      { userId: number; amount: number },
      ApiResponse<
        200 | 400 | 500,
        {
          overallBudget?: {
            amount: number;
            spent: number;
            remaining: number;
          };
          message?: string;
          error?: string;
        }
      >
    >;

    // Update category budget
    "budget-category-update": ApiRouteHandler<
      { userId: number; category: ExpenseCategory; limit: number },
      ApiResponse<
        200 | 400 | 500,
        {
          category?: {
            name: ExpenseCategory;
            spent: number;
            limit: number;
          };
          message?: string;
          error?: string;
        }
      >
    >;


    "budget-expense-history": ApiRouteHandler<
      { userId: number; category?: string; startDate?: string; endDate?: string },
      ApiResponse<
        200 | 400 | 500,
        {
          expenses?: {
            id: number;
            date: string;
            category: string;
            description: string | null;
            amount: number;
          }[];
          message?: string;
          error?: string;
        }
      >
    >;

    // Monthly budget update (overall + missing category budgets)
    "monthly-budget-update": ApiRouteHandler<
      {
        userId: number;
        amount: number;
      },
      ApiResponse<
        200 | 400 | 500,
        {
          message?: string;
          overallBudget?: {
            amount: number;
          };
          categoriesCreated?: ExpenseCategory[];
          error?: string;
        }
      >
    >;

    "reports-analytics": ApiRouteHandler<
      { startDate: string; endDate: string },
      ApiResponse<
        200 | 400 | 404 | 500,
        {
          spendingByCategory?: { category: string; amount: number }[];
          dailySpendingTrend?: { date: string; amount: number }[];
          insights?: {
            highestExpense: number;
            averageDaily: number;
            totalTransactions: number;
            recurringTotal: number;
          };
          error?: string;
        }
      >
    >;
    "reports-export": ApiRouteHandler<
      { startDate: string; endDate: string; format: "pdf" | "excel" },
      ApiResponse<200 | 400 | 500 | 401, { message?: string; error?: string }>
    >;

    'SendOtp': EventHandler<{ templateId: string; email: string; templateData: Record<string, unknown> }, never>

    'DailyEmailCron': CronHandler<never>

    'Notification': EventHandler<{ templateId: string; email: string; templateData: Record<string, unknown> }, never>
  }
}
