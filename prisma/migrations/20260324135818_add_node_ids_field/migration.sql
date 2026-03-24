-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "webAppId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mappings" TEXT NOT NULL DEFAULT '{}',
    "nodeIds" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Application" ("apiKey", "createdAt", "description", "id", "isActive", "mappings", "modelName", "name", "updatedAt", "webAppId") SELECT "apiKey", "createdAt", "description", "id", "isActive", "mappings", "modelName", "name", "updatedAt", "webAppId" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE UNIQUE INDEX "Application_modelName_key" ON "Application"("modelName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
