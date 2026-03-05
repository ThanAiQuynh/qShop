import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const logDir = 'd:/selfcode/qshop/logs';

const filter = (level: string) => winston.format((info) => (info.level === level ? info : false))();

export const loggerConfig = {
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.ms(),
                nestWinstonModuleUtilities.format.nestLike('QShop', {
                    colors: true,
                    prettyPrint: true,
                }),
            ),
        }),
        new winston.transports.File({
            filename: `${logDir}/error.log`,
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),
        new winston.transports.File({
            filename: `${logDir}/warn.log`,
            level: 'warn',
            format: winston.format.combine(
                filter('warn'),
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),
        new winston.transports.File({
            filename: `${logDir}/info.log`,
            level: 'info',
            format: winston.format.combine(
                filter('info'),
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),
    ],
};
