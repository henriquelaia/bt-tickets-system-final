import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar utilizadores' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role as Role || Role.COLLABORATOR
            }
        });
        res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar utilizador' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao apagar utilizador' });
    }
};



export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const { name, password } = req.body;

    try {
        const data: any = {};
        if (name) data.name = name;
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, name: true, email: true, role: true, avatarUrl: true }
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
};

import { supabase } from '../config/supabase';

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum ficheiro carregado' });
    }

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `avatars/${userId}-${timestamp}.${fileExt}`;

        // Upload to Supabase
        const { error: uploadError } = await supabase.storage
            .from('ticket-attachments') // Using the same bucket
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return res.status(500).json({ message: 'Erro ao fazer upload para storage' });
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(fileName);

        const user = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: publicUrl },
            select: { id: true, name: true, email: true, role: true, avatarUrl: true }
        });
        res.json(user);
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ message: 'Erro ao carregar avatar' });
    }
};

