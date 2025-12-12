import { GoogleGenAI } from "@google/genai";
import { CampaignType, CampaignItem } from "../types";

// Safety check for API Key
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateCampaignDescription = async (
  title: string,
  type: CampaignType,
  items: CampaignItem[]
): Promise<string> => {
  if (!API_KEY) {
    console.warn("API Key not found. Returning default description.");
    return "Descrição gerada automaticamente não disponível (Chave API ausente).";
  }

  const itemList = items.map(i => `${i.targetQuantity} ${i.unit} de ${i.name}`).join(', ');

  const prompt = `
    Você é um assistente de uma ONG chamada "Lar Assistencial Matilde".
    Crie uma descrição curta, inspiradora e apelativa para doadores para uma campanha de doação.
    
    Detalhes da campanha:
    Título: ${title}
    Tipo: ${type}
    Itens necessários: ${itemList}
    
    A descrição deve ter no máximo 3 parágrafos curtos e enfatizar como essa ajuda fará a diferença na vida das famílias e crianças carentes.
    Use emojis moderadamente.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Erro ao conectar com a IA para gerar descrição.";
  }
};
