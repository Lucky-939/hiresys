"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const database_1 = require("../../config/database");
class AuthRepository {
    findByEmail(email) {
        return database_1.prisma.user.findUnique({ where: { email } });
    }
    createUser(data) {
        return database_1.prisma.user.create({ data });
    }
}
exports.AuthRepository = AuthRepository;
