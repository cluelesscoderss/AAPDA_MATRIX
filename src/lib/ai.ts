
import { SOS } from "./store";

const CRITICAL_KEYWORDS = ["bleeding", "severe", "life", "unconscious", "stroke", "dying"];
const HIGH_KEYWORDS = ["trapped", "water", "drowning", "stuck", "flood", "fire", "rising"];
const MODERATE_KEYWORDS = ["pain", "hurt", "medicine", "supplies", "medical", "injury"];
const LOW_KEYWORDS = ["food", "hungry", "thirsty", "starving"];

export const analyzeSOS = (text: string): { priority: SOS['priority']; category: string } => {
          const lowerText = text.toLowerCase();

          if (CRITICAL_KEYWORDS.some(k => lowerText.includes(k)))
                    return { priority: 'Critical', category: 'Major Injury' };

          if (HIGH_KEYWORDS.some(k => lowerText.includes(k)))
                    return { priority: 'High', category: 'Trapped/Rising Water' };

          if (MODERATE_KEYWORDS.some(k => lowerText.includes(k)))
                    return { priority: 'Moderate', category: 'Medical Supplies Need' };

          if (LOW_KEYWORDS.some(k => lowerText.includes(k)))
                    return { priority: 'Low', category: 'Food/Water Depletion' };

          return { priority: 'Low', category: 'General Assistance' };
};
