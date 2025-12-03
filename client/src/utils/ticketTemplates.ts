export const TICKET_TEMPLATES = [
    {
        id: 'bug',
        name: '🐛 Bug Report',
        title: '[BUG] ',
        description: `**Descrição do Bug:**


**Passos para Reproduzir:**
1. 
2. 
3. 

**Resultado Esperado:**


**Resultado Atual:**


**Screenshots/Logs:**
(Anexar se possível)

**Ambiente:**
- Navegador: 
- Sistema Operativo: 
- Versão da Aplicação: `,
        priority: 'HIGH' as const,
        suggestedCategory: 'Bug'
    },
    {
        id: 'feature',
        name: '✨ Feature Request',
        title: '[FEATURE] ',
        description: `**Funcionalidade Solicitada:**


**Caso de Uso:**
Descreva como e quando esta funcionalidade seria usada.


**Benefícios:**
- 
- 
- 

**Alternativas Consideradas:**


**Prioridade Sugerida:**
(Baixa/Média/Alta/Urgente)`,
        priority: 'MEDIUM' as const,
        suggestedCategory: 'Feature Request'
    },
    {
        id: 'support',
        name: '❓ Pedido de Suporte',
        title: '[SUPORTE] ',
        description: `**Questão/Problema:**


**O que já tentei:**
- 
- 

**Informação Adicional:**


**Urgência:**
(Quando precisa de resposta)`,
        priority: 'MEDIUM' as const,
        suggestedCategory: 'Suporte'
    },
    {
        id: 'task',
        name: '✅ Tarefa/To-Do',
        title: '[TASK] ',
        description: `**Objetivo:**


**Tarefas:**
- [ ] 
- [ ] 
- [ ] 

**Recursos Necessários:**


**Prazo:**


**Notas:**`,
        priority: 'MEDIUM' as const,
        suggestedCategory: 'Tarefa'
    },
    {
        id: 'improvement',
        name: '🚀 Melhoria',
        title: '[MELHORIA] ',
        description: `**Área a Melhorar:**


**Sugestão de Melhoria:**


**Impacto Esperado:**
- Performance: 
- UX: 
- Outro: 

**Implementação Sugerida:**


**Referências:**
(Links, exemplos, etc.)`,
        priority: 'LOW' as const,
        suggestedCategory: 'Melhoria'
    },
    {
        id: 'security',
        name: '🔒 Segurança',
        title: '[SEGURANÇA] ',
        description: `**CONFIDENCIAL - Vulnerabilidade de Segurança**

**Tipo de Vulnerabilidade:**


**Descrição Detalhada:**


**Impacto Potencial:**


**Passos para Reproduzir:**
(Se aplicável)

**Recomendação de Correção:**


---
⚠️ POR FAVOR, NÃO PARTILHE DETALHES PUBLICAMENTE ATÉ SER CORRIGIDO`,
        priority: 'URGENT' as const,
        suggestedCategory: 'Segurança'
    }
];

export function getTemplateById(id: string) {
    return TICKET_TEMPLATES.find(t => t.id === id);
}
