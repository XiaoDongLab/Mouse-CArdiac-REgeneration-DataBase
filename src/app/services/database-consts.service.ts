import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DatabaseConstsService {
  tissueTypes: string[] = [   
      "Heart",
      "Bone Marrow"
  ]
  cellTypes: string[] = [
    "Adipose progenitor cell" ,"Adipose-derived stem cell" ,"Adipose-derived stromal cell" ,"Adipose multilineage-differentiating stress-enduring cell" ,"Beige adipogenic precursor cell" ,
    "Type I pneumocyte" ,"Urine-derived stem cell" ,"Vaginal cell" ,"Atypical memory B cell", "Well-established epicardial progenitor cell", "Mural cell", "Endothelial cell", "Endothelial cell 2", "Sinoatrial node (SAN) cell", 
    "Macrophage", "Cardiomyocyte", "M2 macrophage", "Cardiomyocyte 2","Cardiomyocyte 3", "Endothelial cell", "Fibroblast","Fibroblast 2", "Fibroblast 3", "Progenitor cell","Atrial cell", "Airway secretory cell","Alpha cell","Alveolar epithelial progenitor cell","Astrocyte","B cell","Basal cell","Beta cell"
  ]

   DiffExpCellTypes = [
    "All Cells, Heart",
    "Cardiac cell",
    "B cell",
    "T cell",
    "Red blood cell",
    "Granulocyte",
    "Cardiomyocyte",
    "Cardiomyocyte 1",
    "Cardiomyocyte 1 2",
    "Cardiomyocyte 1 3",
    "Cardiomyocyte 1 4",
    "Cardiomyocyte 2",
    "Cardiomyocyte 2 2",
    "Cardiomyocyte 2 3",
    "Cardiomyocyte 2 4",
    "Cardiomyocyte 3",
    "Cardiomyocyte 4",
    "Cardiomyocyte 4 2",
    "Sinoatrial node (SAN) cell",
    "Sinoatrial node cell",
    "Endothelial cell",
    "Endothelial cell 2",
    "Endothelial cell 3",
    "Endothelial cell 4",
    "Endothelial cell 5",
    "Endothelial cell 6",
    "Macrophage",
    "Macrophage 2",
    "M2 macrophage",
    "Fibroblast",
    "Fibroblast 2",
    "Fibroblast 3",
    "Fibroblast 4",
    "Fibroblast 5",
    "Fibroblast 6",
    "Mural cell",
    "Well-established epicardial progenitor cell",
    "Progenitor cell",
    "Activated fibroblast"
  ];
  
  species: string[] =[
    "matrix", "barcodes", "tsne", "umap", "info", "features", "diffExp", "Go Enrich", "DEG Results"
  ]

  DiffExpPMIDTissueDict: { [key: string]: number[] } = {
    "Bone Marrow": [30518681],
    "Brain": [31316211, 31178122],
    "Colon": [32888429, 34428183],
    "Kidney": [31896769],
    "Liver": [30348985, 35021063],
    "Lung": [30554520, 36108172],
    "Pancreas": [30865899, 34450029],
    "Heart": [33296652, 34489413, 38510108]
  };

  KEGGPathways: string[] = ["Cytokine-cytokine receptor interaction", "Staphylococcus aureus infection", "Leishmaniasis", "IL-17 signaling pathway", "Chemokine signaling pathway", "Rheumatoid arthritis", "Tuberculosis", "Inflammatory bowel disease (IBD)", "Osteoclast differentiation", "Systemic lupus erythematosus", "Cytosolic DNA-sensing pathway", "Proteasome", "Asthma", "Hematopoietic cell lineage", "Phagosome", "NF-kappa B signaling pathway", "Legionellosis", "Arachidonic acid metabolism", "Pertussis", "Graft-versus-host disease", "NOD-like receptor signaling pathway", "C-type lectin receptor signaling pathway", "Intestinal immune network for IgA production", "Glycolysis / Gluconeogenesis", "Natural killer cell mediated cytotoxicity", "Lysosome", "Type I diabetes mellitus", "Complement and coagulation cascades", "TNF signaling pathway", "Primary immunodeficiency", "Toll-like receptor signaling pathway", "Allograft rejection", "Influenza A", "Ribosome", "Pentose phosphate pathway", "Ferroptosis", "Autoimmune thyroid disease", "Chagas disease (American trypanosomiasis)", "Amino sugar and nucleotide sugar metabolism", "Malaria", "Antigen processing and presentation", "T cell receptor signaling pathway", "Axon guidance", "Cell adhesion molecules (CAMs)", "Mineral absorption", "Salmonella infection", "ECM-receptor interaction", "Hedgehog signaling pathway", "Fructose and mannose metabolism", "Necroptosis", "Protein export", "One carbon pool by folate", "Ribosome biogenesis in eukaryotes", "Th17 cell differentiation", "Circadian rhythm", "Prion diseases", "Acute myeloid leukemia", "Arginine biosynthesis", "cGMP-PKG signaling pathway", "Notch signaling pathway", "Maturity onset diabetes of the young", "Galactose metabolism", "Rap1 signaling pathway", "Neuroactive ligand-receptor interaction", "Epstein-Barr virus infection", "Drug metabolism", "Circadian entrainment", "Dilated cardiomyopathy (DCM)", "Pentose and glucuronate interconversions", "Glycine, serine and threonine metabolism", "Type II diabetes mellitus", "Arrhythmogenic right ventricular cardiomyopathy (ARVC)", "Metabolism of xenobiotics by cytochrome P450", "Retinol metabolism", "B cell receptor signaling pathway", "Glutathione metabolism", "Collecting duct acid secretion", "Transcriptional misregulation in cancer", "Fc epsilon RI signaling pathway", "Breast cancer", "Lysine degradation", "Other types of O-glycan biosynthesis", "Renin-angiotensin system", "Phosphatidylinositol signaling system", "Fc gamma R-mediated phagocytosis", "Basal cell carcinoma", "Chemical carcinogenesis", "Adrenergic signaling in cardiomyocytes", "Amoebiasis", "Progesterone-mediated oocyte maturation", "HIF-1 signaling pathway", "AMPK signaling pathway", "Focal adhesion", "Measles", "Nicotinate and nicotinamide metabolism", "Pantothenate and CoA biosynthesis", "Hippo signaling pathway", "Pyrimidine metabolism", "Steroid hormone biosynthesis", "Synthesis and degradation of ketone bodies", "Taste transduction", "Apoptosis", "Morphine addiction", "Cholinergic synapse", "African trypanosomiasis", "Th1 and Th2 cell differentiation", "Regulation of lipolysis in adipocytes", "Nitrogen metabolism", "Parathyroid hormone synthesis, secretion and action", "Fanconi anemia pathway", "Riboflavin metabolism", "cAMP signaling pathway", "Wnt signaling pathway", "Arginine and proline metabolism", "Aldosterone synthesis and secretion", "GABAergic synapse", "Oocyte meiosis", "RIG-I-like receptor signaling pathway", "Signaling pathways regulating pluripotency of stem cells", "Phospholipase D signaling pathway", "Cushing syndrome", "Kaposi sarcoma-associated herpesvirus infection", "Longevity regulating pathway", "Adherens junction", "Human papillomavirus infection", "Fluid shear stress and atherosclerosis", "Toxoplasmosis", "Hypertrophic cardiomyopathy (HCM)", "ABC transporters", "PI3K-Akt signaling pathway", "Ras signaling pathway", "Thyroid cancer", "Gap junction", "Thyroid hormone signaling pathway", "Prolactin signaling pathway", "Human cytomegalovirus infection", "Histidine metabolism", "Cortisol synthesis and secretion", "Leukocyte transendothelial migration", "Olfactory transduction", "Vascular smooth muscle contraction", "Glutamatergic synapse", "Small cell lung cancer", "Pathways in cancer", "Starch and sucrose metabolism", "Aldosterone-regulated sodium reabsorption", "Insulin secretion", "JAK-STAT signaling pathway", "Pancreatic secretion", "Dopaminergic synapse", "Protein digestion and absorption", "Insulin signaling pathway", "Salivary secretion", "Viral myocarditis", "Folate biosynthesis", "Gastric acid secretion", "Estrogen signaling pathway", "Ubiquinone and other terpenoid-quinone biosynthesis", "Long-term depression", "Melanogenesis", "Glucagon signaling pathway", "Serotonergic synapse", "Choline metabolism in cancer", "Oxytocin signaling pathway", "Glyoxylate and dicarboxylate metabolism", "Insulin resistance", "Inositol phosphate metabolism", "Cholesterol metabolism", "Cardiac muscle contraction", "Renin secretion", "Tight junction", "MicroRNAs in cancer", "Non-homologous end-joining", "Apelin signaling pathway", "Endometrial cancer", "Phenylalanine metabolism", "Ether lipid metabolism", "Amphetamine addiction", "Bile secretion", "Platelet activation", "Gastric cancer", "Retrograde endocannabinoid signaling", "Thyroid hormone synthesis", "Autophagy", "beta-Alanine metabolism", "ErbB signaling pathway", "Central carbon metabolism in cancer", "Herpes simplex virus 1 infection", "Inflammatory mediator regulation of TRP channels", "RNA polymerase", "Relaxin signaling pathway", "Oxidative phosphorylation", "MAPK signaling pathway", "Porphyrin and chlorophyll metabolism", "FoxO signaling pathway", "TGF-beta signaling pathway", "Nicotine addiction", "Regulation of actin cytoskeleton", "Long-term potentiation", "Calcium signaling pathway", "GnRH signaling pathway", "Pancreatic cancer", "Bacterial invasion of epithelial cells", "Hepatocellular carcinoma", "Fat digestion and absorption", "Cysteine and methionine metabolism", "Butanoate metabolism", "Amyotrophic lateral sclerosis (ALS)", "Non-small cell lung cancer", "Ascorbate and aldarate metabolism", "mTOR signaling pathway", "Alanine, aspartate and glutamate metabolism", "Tyrosine metabolism", "Ubiquitin mediated proteolysis", "Thiamine metabolism", "VEGF signaling pathway", "Endocrine and other factor-regulated calcium reabsorption", "Purine metabolism", "Ovarian steroidogenesis", "Hepatitis C", "AGE-RAGE signaling pathway in diabetic complications", "Citrate cycle (TCA cycle)", "Colorectal cancer", "Chronic myeloid leukemia", "Thermogenesis", "Sphingolipid signaling pathway", "Proximal tubule bicarbonate reclamation", "Tryptophan metabolism", "Human immunodeficiency virus 1 infection", "Prostate cancer", "Protein processing in endoplasmic reticulum", "Homologous recombination", "Phosphonate and phosphinate metabolism", "Phototransduction", "Carbohydrate digestion and absorption", "Fatty acid biosynthesis", "Base excision repair", "Cellular senescence", "Glycerophospholipid metabolism", "Human T-cell leukemia virus 1 infection", "mRNA surveillance pathway", "Fatty acid degradation", "Glycosaminoglycan biosynthesis", "Endocytosis", "Nucleotide excision repair", "Melanoma", "Proteoglycans in cancer", "Other glycan degradation", "Neurotrophin signaling pathway", "Primary bile acid biosynthesis", "Non-alcoholic fatty liver disease (NAFLD)", "Cell cycle", "Adipocytokine signaling pathway", "Glycosphingolipid biosynthesis", "PPAR signaling pathway", "Glycosaminoglycan degradation", "Parkinson disease", "Alzheimer disease", "SNARE interactions in vesicular transport", "Glioma", "Hepatitis B", "Mismatch repair", "N-Glycan biosynthesis", "alpha-Linolenic acid metabolism", "Biosynthesis of unsaturated fatty acids", "Synaptic vesicle cycle", "RNA transport", "Sphingolipid metabolism", "Glycerolipid metabolism", "Propanoate metabolism", "Mannose type O-glycan biosynthesis", "p53 signaling pathway", "Viral carcinogenesis", "Terpenoid backbone biosynthesis", "RNA degradation", "Alcoholism", "Cocaine addiction", "DNA replication", "Renal cell carcinoma", "Vasopressin-regulated water reabsorption", "Glycosylphosphatidylinositol (GPI)-anchor biosynthesis", "Selenocompound metabolism", "Mitophagy", "Mucin type O-glycan biosynthesis", "Pyruvate metabolism", "Sulfur relay system", "Spliceosome", "Aminoacyl-tRNA biosynthesis", "Vitamin digestion and absorption", "Bladder cancer", "Sulfur metabolism", "Basal transcription factors", "Steroid biosynthesis", "Peroxisome", "Fatty acid elongation", "Valine, leucine and isoleucine degradation", "Huntington disease", "Linoleic acid metabolism", "Vitamin B6 metabolism", "Taurine and hypotaurine metabolism", "Neomycin, kanamycin and gentamicin biosynthesis"];


  getTissueTypes(){
    return this.tissueTypes
  }
  getCellTypes(){
    return this.cellTypes
  }
  getSpecies(){
    return this.species
  }
  getDePmidTissueDict(){
    return this.DiffExpPMIDTissueDict
  }
  getDECellTypes(){
    return this.DiffExpCellTypes
  }
  getKEGGPathways() {
    return this.KEGGPathways;
  }

  constructor() { }
}
