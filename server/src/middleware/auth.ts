import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: {
        id: number;
        role: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acesso necessário' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'supersecretkeychangeinproduction';
        const decoded = jwt.verify(token, secret) as { id: number; role: string };
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido ou expirado' });
    }
};

export const authorizeRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        next();
    };
};
