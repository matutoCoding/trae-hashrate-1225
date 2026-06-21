import type { Order, BuilderTeam, FitScore, CustomerPreferences } from '@/types';

export function calculateFitScore(
  order: Order, 
  builder: BuilderTeam, 
  customerPreferences: CustomerPreferences = {}
): FitScore {
  const priceWeight: Record<string, number> = { economy: 100, standard: 75, premium: 50 };
  const preferredPrice = customerPreferences.preferredPriceLevel || 'standard';
  const priceFit = builder.priceLevel === preferredPrice 
    ? 100 
    : priceWeight[builder.priceLevel] || 75;
  
  const orderDate = new Date(order.startDate);
  const timeFit = builder.availability.some(d => 
    Math.abs(new Date(d).getTime() - orderDate.getTime()) < 86400000
  ) ? 100 : 60;
  
  const experienceFit = Math.min(builder.experience * 10, 100);
  
  const requiredSkills = customerPreferences.requiredSkills || [];
  const matchedSkills = requiredSkills.filter(s => 
    builder.skills.includes(s)
  ).length;
  const skillFit = requiredSkills.length > 0 
    ? (matchedSkills / requiredSkills.length) * 100 
    : 100;
  
  const minRating = customerPreferences.minRating || 3;
  const ratingFit = builder.rating >= minRating 
    ? 100 
    : (builder.rating / minRating) * 100;
  
  const weights = { price: 0.25, time: 0.2, experience: 0.2, skill: 0.2, rating: 0.15 };
  const totalScore = 
    priceFit * weights.price +
    timeFit * weights.time +
    experienceFit * weights.experience +
    skillFit * weights.skill +
    ratingFit * weights.rating;
  
  return {
    priceFit: Math.round(priceFit),
    timeFit: Math.round(timeFit),
    experienceFit: Math.round(experienceFit),
    skillFit: Math.round(skillFit),
    ratingFit: Math.round(ratingFit),
    totalScore: Math.round(totalScore)
  };
}

export function sortBuildersByFitScore(
  builders: BuilderTeam[],
  order: Order,
  customerPreferences: CustomerPreferences = {}
): (BuilderTeam & { fitScore: FitScore })[] {
  return builders
    .map(builder => ({
      ...builder,
      fitScore: calculateFitScore(order, builder, customerPreferences)
    }))
    .sort((a, b) => b.fitScore.totalScore - a.fitScore.totalScore);
}
