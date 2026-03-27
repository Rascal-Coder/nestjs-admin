-- AlterTable
ALTER TABLE `users` ADD COLUMN `role_code` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_code_fkey` FOREIGN KEY (`role_code`) REFERENCES `roles`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;
