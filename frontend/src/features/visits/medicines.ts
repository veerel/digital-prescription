/** Reference list powering the medicine-name suggestions in the prescription form. */
export const medicineReference = [
  "Paracetamol 500mg",
  "Amoxicillin 500mg",
  "Amoxiclav 625mg",
  "Azithromycin 500mg",
  "Doxycycline 100mg",
  "Metformin 500mg",
  "Glimepiride 2mg",
  "Insulin Glargine",
  "Amlodipine 5mg",
  "Atorvastatin 10mg",
  "Losartan 50mg",
  "Telmisartan 40mg",
  "Metoprolol 25mg",
  "Aspirin 75mg",
  "Clopidogrel 75mg",
  "Omeprazole 20mg",
  "Pantoprazole 40mg",
  "Ranitidine 150mg",
  "Domperidone 10mg",
  "Cetirizine 10mg",
  "Levocetirizine 5mg",
  "Montelukast 10mg",
  "Salbutamol Inhaler",
  "Ibuprofen 400mg",
  "Diclofenac 50mg",
  "Vitamin D3 60000IU",
  "Vitamin B12 1500mcg",
  "Calcium Carbonate 500mg",
  "Multivitamin Syrup",
  "ORS Powder",
  "Hydrocortisone Cream 1%",
  "Clotrimazole Cream",
];

export interface MedicineRow {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export const emptyRow = (): MedicineRow => ({
  name: "",
  dosage: "",
  frequency: "Twice daily",
  duration: "",
  instructions: "After food",
});
