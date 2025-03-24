-- AlterTable
ALTER TABLE `event` ADD COLUMN `stateId` INTEGER NULL,
    ADD COLUMN `zoneId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
