import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar categorias' });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    const { name } = req.body;
    try {
        const category = await prisma.category.create({
            data: { name }
        });
        res.status(201).json(category);
    } catch (error: any) {
        console.error('Error creating category:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Uma categoria com este nome já existe.' });
        }
        res.status(500).json({ message: 'Erro ao criar categoria' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Verificar se há tickets associados a esta categoria
        const ticketCount = await prisma.ticket.count({
            where: { categoryId: parseInt(id) }
        });

        if (ticketCount > 0) {
            return res.status(409).json({
                message: `Não é possível apagar esta categoria. Existem ${ticketCount} ticket(s) associado(s).`
            });
        }

        await prisma.category.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting category:', error);
        // Catch foreign key constraint error as backup
        if (error.code === 'P2003') {
            return res.status(409).json({
                message: 'Não é possível apagar esta categoria. Existem tickets associados.'
            });
        }
        res.status(500).json({ message: 'Erro ao apagar categoria' });
    }
};
