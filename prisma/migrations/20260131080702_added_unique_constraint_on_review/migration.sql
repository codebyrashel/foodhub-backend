/*
  Warnings:

  - A unique constraint covering the columns `[customerId,mealId]` on the table `review` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "review_customerId_mealId_key" ON "review"("customerId", "mealId");
