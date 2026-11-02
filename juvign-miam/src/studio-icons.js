// Local vector icons; no font, network request or external image is required.
export const iconChoices=[['home','Accueil'],['user','Profil'],['settings','Paramètres'],['menu','Menu'],['back','Retour'],['arrow','Suivant'],['heart','Favori'],['star','Étoile'],['cart','Panier'],['bag','Sac'],['search','Recherche'],['plus','Ajouter'],['minus','Retirer'],['check','Valider'],['close','Fermer'],['trash','Supprimer'],['edit','Modifier'],['mail','Message'],['phone','Téléphone'],['calendar','Calendrier'],['clock','Horloge'],['pin','Lieu'],['bell','Notification'],['lock','Cadenas'],['eye','Voir'],['info','Information'],['help','Aide'],['download','Télécharger'],['share','Partager'],['sun','Soleil'],['moon','Lune'],['music','Musique'],['trophy','Trophée'],['chat','Discussion'],['grid','Grille'],['list','Liste'],['camera','Photo'],['image','Image'],['bolt','Éclair'],['book','Livre']].map(([id,label])=>({id,label}));
// Keep this function independent: its source is embedded in standalone exports.
export function renderAppIcon(name,size=24){
 const paths={
 home:'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
 user:'M20 21v-2a8 8 0 0 0-16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 settings:'m9 3-1 3-3 1-2 4 2 2v3l3 2 1 3h6l1-3 3-2v-3l2-2-2-4-3-1-1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 menu:'M4 6h16M4 12h16M4 18h16',back:'m11 5-7 7 7 7M4 12h16',arrow:'m13 5 7 7-7 7M4 12h16',
 heart:'M12 21 3.5 13a5.5 5.5 0 0 1 8.5-7 5.5 5.5 0 0 1 8.5 7Z',star:'m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4L2.8 9.7l6.4-.9Z',
 cart:'M2 3h3l3 12h11l3-9H6M10 20h.01M18 20h.01',bag:'M5 7h14l1 14H4ZM8 8V6a4 4 0 0 1 8 0v2',search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-2 4 7 7',
 plus:'M12 4v16M4 12h16',minus:'M4 12h16',check:'m4 12 5 5L20 6',close:'m5 5 14 14M5 19 19 5',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
 edit:'m4 16 12-12 4 4L8 20H4Zm9-9 4 4',mail:'M3 5h18v14H3ZM3 6l9 7 9-7',phone:'M6 3H3c0 10 8 18 18 18v-3l-5-3-3 3-7-7 3-3Z',
 calendar:'M3 5h18v16H3ZM7 2v6M17 2v6M3 10h18M7 14h2M15 14h2M7 18h2',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v6l4 3',pin:'M12 22S4 14 4 9a8 8 0 0 1 16 0c0 5-8 13-8 13Zm3-13a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 bell:'M4 17h16l-2-4V8a6 6 0 0 0-12 0v5ZM10 21h4',lock:'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 11v6M12 7h.01',help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 9a3 3 0 1 1 5 2c-2 1-2 1-2 3M12 18h.01',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',share:'M18 3h3v3M21 3l-9 9M10 5H3v16h16v-7',
 sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',moon:'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z',music:'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 trophy:'M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3a5 5 0 0 0 5 5M17 5h4v3a5 5 0 0 1-5 5M12 15v6M7 21h10',chat:'M3 3h18v14H8l-5 4Z',grid:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',list:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
 camera:'M3 7h4l2-3h6l2 3h4v14H3Zm13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',image:'M3 3h18v18H3Zm0 14 6-6 5 5 3-3 4 4M8 7h.01',bolt:'m13 2-9 12h7l-1 8 10-13h-7Z',book:'M3 3c4 0 7 0 9 3 2-3 5-3 9-3v17c-4 0-7 0-9 2-2-2-5-2-9-2ZM12 6v16'
 };
 const path=Object.hasOwn(paths,String(name))?paths[name]:null;if(!path)return '';
 const px=Math.max(12,Math.min(120,Number(size)||24));return `<svg class="app-icon" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}
