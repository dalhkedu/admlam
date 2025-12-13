import { GoogleGenAI, Type } from "@google/genai";
import { CampaignType, CampaignItem, PackageItem, Family } from "../types";
import { StorageService } from "./storage";

const getAI = () => {
    const apiKey = StorageService.getApiKey() || process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const generateCampaignDescription = async (
  title: string,
  type: CampaignType,
  items: CampaignItem[]
): Promise<string> => {
  const ai = getAI();
  if (!ai) {
    return "⚠️ Configure a Chave API nas Configurações para usar a IA.";
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
    return "Erro ao conectar com a IA para gerar descrição. Verifique sua chave API.";
  }
};

export const suggestPackageItems = async (packageName: string, description: string): Promise<PackageItem[]> => {
    const ai = getAI();
    if (!ai) {
        throw new Error("API Key ausente");
    }

    const prompt = `
      Crie uma lista de itens para uma cesta de doação ou pacote da ONG.
      Nome do Pacote: ${packageName}
      Descrição: ${description}

      Retorne APENAS um JSON array. Cada objeto deve ter:
      - name (string)
      - quantity (number, pode ser float)
      - unit (string: 'un', 'kg', 'lt', 'pc')
      
      Exemplo de itens: Arroz 5kg, Leite 2un, Sabonete 1un.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            quantity: { type: Type.NUMBER },
                            unit: { type: Type.STRING, enum: ['un', 'kg', 'lt', 'pc'] }
                        },
                        required: ['name', 'quantity', 'unit']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        
        const data = JSON.parse(text);
        // Add random IDs
        return data.map((item: any) => ({
            ...item,
            id: crypto.randomUUID()
        }));

    } catch (error) {
        console.error("Error suggesting items:", error);
        throw error;
    }
};

export const parseFamilyData = async (rawText: string): Promise<Partial<Family>> => {
    const ai = getAI();
    if (!ai) {
         throw new Error("API Key ausente");
    }

    const prompt = `
      Analise o texto abaixo e extraia os dados de uma família para cadastro na ONG.
      
      Texto: "${rawText}"
      
      Retorne um JSON com a estrutura:
      - responsibleName (string)
      - address (string)
      - phone (string)
      - numberOfAdults (number)
      - children (array de objetos):
         - name (string)
         - age (number)
         - gender ('M' ou 'F', ou 'Outro' se não especificado)
         - clothingSize (string, tente estimar pelo tamanho ou idade se não houver: 'P','M','G' ou '2','4','6','8','10','12','14')
         - shoeSize (number, tente estimar pela idade se não houver)
         - notes (string, qualquer obs extra)

      Se faltar informação, use valores padrão razoáveis ou deixe string vazia, mas não invente dados.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Error parsing family:", error);
        throw error;
    }
}
