import { ApiRouteConfig, Handlers } from "motia";
import { dbInit } from "../../src/bootstrap";

export const config: ApiRouteConfig = {
    type: "api",
    name: "db-test",
    path: "/db-test",
    method: "GET",
    emits: [],
    flows: [],
};

export const handler: Handlers["db-test"] = async () => {
    if (!dbInit.isInitialized) {
        console.log("Initializing DB connection...");
        try {
            await dbInit.initialize();
            console.log("✅ DB connected!");
            return {
                status: 200,
                body: { message: "✅ DB connection initialized" },
            };
        } catch (err: any) {
            console.error("❌ DB connection failed:", err.message);
            return {
                status: 500,
                body: { message: "❌ DB connection failed", error: err.message },
            };
        }
    }

};
