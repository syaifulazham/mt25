-- Add foreign key constraint between cert_template and event
ALTER TABLE `cert_template` 
ADD CONSTRAINT `fk_cert_template_event` 
FOREIGN KEY (`eventId`) REFERENCES `event` (`id`) 
ON DELETE RESTRICT ON UPDATE CASCADE;
