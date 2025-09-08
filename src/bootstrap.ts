import { AppDataSource } from "../src/ormconfig";
import { ObjectLiteral, Repository } from "typeorm";

export const dbInit = {
  isInitialized: false,
  
  initialize: async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("✅ Database connected");
    }
    dbInit.isInitialized = true;
    return AppDataSource;
  },

  getRepository: <T extends ObjectLiteral>(entity: { new (): T } | Function): Repository<T> => {
    if (!dbInit.isInitialized) {
      throw new Error("DataSource not initialized. Call dbInit.initialize() first.");
    }
    return AppDataSource.getRepository<T>(entity);
  },
};
