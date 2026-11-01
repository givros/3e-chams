export const course = [
  {
    "title": "Invente ton restaurant",
    "chapter": 0,
    "kind": "PERSONNALISER",
    "time": 12,
    "concept": "Tes premières variables créent ton identité.",
    "explanation": "Choisis ce que tu veux servir et l’ambiance de ton appli. Ces textes dans ton code changent les photos, les couleurs et la disposition du téléphone. Ton voisin peut créer un tout autre restaurant. Tu peux aussi ouvrir Mon style pour essayer un slogan, une couleur personnelle et une photo différente.",
    "task": "Écris quatre lignes : restaurantName (ton nom), cuisine (\"burger\", \"pizza\", \"sushi\" ou \"tacos\"), theme (\"sunset\", \"arcade\" ou \"ocean\") et menuLayout (\"list\" ou \"tiles\"). Chaque ligne commence par const, puis le nom, = et ton texte entre guillemets.",
    "hint": "Exemple à adapter :\nconst restaurantName = \"Pixel Pizza\";\nconst cuisine = \"pizza\";\nconst theme = \"arcade\";\nconst menuLayout = \"tiles\";",
    "seed": "",
    "tests": [
      {
        "key": "restaurantName",
        "type": "name"
      },
      {
        "key": "cuisine",
        "type": "field"
      },
      {
        "key": "theme",
        "type": "field"
      },
      {
        "key": "menuLayout",
        "type": "field"
      }
    ]
  },
  {
    "title": "Le clic qui ajoute",
    "chapter": 0,
    "kind": "COMPLÉTER",
    "time": 8,
    "concept": "Un bouton appelle une fonction.",
    "explanation": "Quand tu touches +, l’interface transmet la quantité actuelle à addQuantity. La valeur renvoyée devient la nouvelle quantité. return signifie « renvoyer le résultat ».",
    "task": "Complète addQuantity pour ajouter 1. Vérifie, puis ajoute deux exemplaires de ton plat principal dans le téléphone.",
    "hint": "Le calcul à renvoyer est quantity + 1.",
    "seed": "\n\nfunction addQuantity(quantity) {\n  return quantity; // complète ce calcul\n}",
    "tests": [
      {
        "key": "addQuantity",
        "args": [
          0
        ],
        "expected": 1
      },
      {
        "key": "addQuantity",
        "args": [
          3
        ],
        "expected": 4
      }
    ]
  },
  {
    "title": "Le panier ne doit pas passer sous zéro",
    "chapter": 1,
    "kind": "RÉPARER UN BUG",
    "time": 10,
    "concept": "Une condition protège une règle.",
    "explanation": "Cette fonction contient un bug : elle peut renvoyer −1. Si la quantité vaut zéro, il faut renvoyer zéro. Dans les autres cas, on retire un article.",
    "task": "Remplace la ligne de removeQuantity par un if, puis un return. Teste le bouton − avec un panier vide.",
    "hint": "if (quantity === 0) { return 0; }\nreturn quantity - 1;",
    "seed": "\n\nfunction removeQuantity(quantity) {\n  return quantity - 1; // bug : et si quantity vaut 0 ?\n}",
    "tests": [
      {
        "key": "removeQuantity",
        "args": [
          0
        ],
        "expected": 0
      },
      {
        "key": "removeQuantity",
        "args": [
          3
        ],
        "expected": 2
      }
    ]
  },
  {
    "title": "Dans la tête d’un bouton",
    "chapter": 1,
    "kind": "QUIZ",
    "time": 5,
    "concept": "Lis ton code comme l’application.",
    "explanation": "Une fonction reçoit une valeur et renvoie un résultat. L’écran utilise ce résultat pour se mettre à jour.",
    "task": "Si quantity vaut 2, que renvoie addQuantity(quantity) ?",
    "hint": "Relis le calcul dans ta fonction addQuantity.",
    "options": [
      "2, car quantity ne change jamais.",
      "3, car la fonction ajoute 1.",
      "Le texte « quantity + 1 »."
    ],
    "answer": 1,
    "why": "La fonction reçoit 2 et renvoie 2 + 1, donc 3. Le bouton utilise cette nouvelle valeur.",
    "seed": "",
    "tests": []
  },
  {
    "title": "Ta carte, tes prix",
    "chapter": 2,
    "kind": "ÉCRIRE UN CALCUL",
    "time": 13,
    "concept": "Tes données deviennent une carte à ton image.",
    "explanation": "Donne un nom personnel à ton plat, ton accompagnement et ta boisson. Fixe leurs prix. La fonction lineTotal doit ensuite fonctionner avec tous les prix, y compris ceux de tes camarades.",
    "task": "Personnalise mainName et mainPrice, sideName et sidePrice, drinkName et drinkPrice. Complète lineTotal avec une multiplication. Compare le panier avec un puis deux exemplaires du plat principal.",
    "hint": "Exemple : const mainName = \"La pizza volcan\"; const mainPrice = 11.5;\nPour calculer une ligne : return unitPrice * quantity;",
    "seed": "\n\n// Ma carte : choisis les noms et les prix.\nconst mainName = \"Mon plat signature\";\nconst mainPrice = 10;\nconst sideName = \"Mon accompagnement\";\nconst sidePrice = 4;\nconst drinkName = \"Ma boisson\";\nconst drinkPrice = 3;\n\nfunction lineTotal(unitPrice, quantity) {\n  return 0;\n}",
    "tests": [
      {
        "key": "lineTotal",
        "args": [
          9.9,
          2
        ],
        "expected": 19.8
      },
      {
        "key": "lineTotal",
        "args": [
          4.5,
          0
        ],
        "expected": 0
      },
      {
        "key": "lineTotal",
        "args": [
          4.5,
          3
        ],
        "expected": 13.5
      },
      {
        "key": "mainName",
        "type": "field"
      },
      {
        "key": "mainPrice",
        "type": "field"
      },
      {
        "key": "sideName",
        "type": "field"
      },
      {
        "key": "sidePrice",
        "type": "field"
      },
      {
        "key": "drinkName",
        "type": "field"
      },
      {
        "key": "drinkPrice",
        "type": "field"
      }
    ]
  },
  {
    "title": "Assembler le panier",
    "chapter": 2,
    "kind": "CONNECTER LES DONNÉES",
    "time": 8,
    "concept": "Une même fonction sert à plusieurs plats.",
    "explanation": "L’interface utilise lineTotal pour chaque plat. Elle transmet ensuite les trois montants à subtotal. Tu n’as pas besoin d’écrire le nom de chaque plat dans ton calcul.",
    "task": "Dans subtotal, additionne first, second et third. Compose ensuite un panier avec deux plats différents.",
    "hint": "return first + second + third;",
    "seed": "\n\nfunction subtotal(first, second, third) {\n  return 0;\n}",
    "tests": [
      {
        "key": "subtotal",
        "args": [
          9.9,
          4.5,
          3.5
        ],
        "expected": 17.9
      },
      {
        "key": "subtotal",
        "args": [
          0,
          9,
          0
        ],
        "expected": 9
      },
      {
        "key": "subtotal",
        "args": [
          0,
          0,
          0
        ],
        "expected": 0
      }
    ]
  },
  {
    "title": "Décide de ta livraison",
    "chapter": 3,
    "kind": "PRENDRE UNE DÉCISION",
    "time": 12,
    "concept": "if / else choisit entre deux résultats.",
    "explanation": "Tu fixes le prix de livraison et le seuil à partir duquel elle est offerte. La condition doit utiliser tes variables : ainsi, modifier une règle ne demande pas de réécrire toute la fonction.",
    "task": "Choisis deliveryPrice (1 à 6 €) et freeDeliveryAt (10 à 50 €, au-dessus du prix de ton article le moins cher). Dans deliveryFee, renvoie 0 si amount >= freeDeliveryAt ; sinon, renvoie deliveryPrice.",
    "hint": "if (amount >= freeDeliveryAt) { return 0; }\nreturn deliveryPrice;",
    "seed": "\n\n// Mes conditions de livraison\nconst deliveryPrice = 2.5;\nconst freeDeliveryAt = 25;\n\nfunction deliveryFee(amount) {\n  return deliveryPrice;\n}",
    "tests": [
      {
        "key": "deliveryPrice",
        "type": "field"
      },
      {
        "key": "freeDeliveryAt",
        "type": "field"
      },
      {
        "key": "deliveryFee",
        "type": "delivery"
      }
    ]
  },
  {
    "title": "Le test de la frontière",
    "chapter": 3,
    "kind": "EXPÉRIENCE",
    "time": 8,
    "concept": "Une règle doit fonctionner des deux côtés de sa limite.",
    "explanation": "Le code peut sembler correct sur un seul exemple. Un bon développeur essaie aussi les cas juste avant et après une limite.",
    "task": "Observe un panier non vide sous ton seuil de livraison gratuite, puis un panier qui atteint ou dépasse ton seuil. Les frais doivent suivre ta règle.",
    "hint": "Ajoute ou retire des articles. Le panier affiche ton seuil personnel et le montant qu’il manque pour la livraison offerte.",
    "seed": "",
    "tests": [],
    "practice": "delivery"
  },
  {
    "title": "Lance ta propre promotion",
    "chapter": 4,
    "kind": "COMPLÉTER UNE CONDITION",
    "time": 12,
    "concept": "Comparer des textes avec ===.",
    "explanation": "Invente ton code promo, choisis le montant minimum et la réduction. Deux conditions doivent être vraies : le bon code ET un panier suffisant. Le symbole && signifie « et ».",
    "task": "Personnalise promoCode, promoMinimum (5 à 35 €, au-dessus de ton article le moins cher) et promoValue (1 à 8 €, inférieur au minimum). Dans discount, vérifie ton code et ton minimum. Renvoie ta réduction si les deux sont vrais, sinon 0. Teste les trois situations indiquées.",
    "hint": "if (code === promoCode && amount >= promoMinimum) { return promoValue; }\nreturn 0;",
    "seed": "\n\n// Ma promotion\nconst promoCode = \"MONCODE\";\nconst promoMinimum = 15;\nconst promoValue = 2;\n\nfunction discount(code, amount) {\n  return 0;\n}",
    "tests": [
      {
        "key": "promoCode",
        "type": "field"
      },
      {
        "key": "promoMinimum",
        "type": "field"
      },
      {
        "key": "promoValue",
        "type": "field"
      },
      {
        "key": "discount",
        "type": "discount"
      }
    ]
  },
  {
    "title": "Le montant final",
    "chapter": 4,
    "kind": "RELIER LES RÈGLES",
    "time": 10,
    "concept": "Des petites fonctions construisent une grande action.",
    "explanation": "Le total utilise trois résultats déjà calculés : le montant des plats, la livraison et la réduction. On ajoute les frais, puis on retire la réduction.",
    "task": "Complète grandTotal avec amount, fee et reduction. Observe ensuite le total avec ton propre code promo appliqué.",
    "hint": "return amount + fee - reduction;",
    "seed": "\n\nfunction grandTotal(amount, fee, reduction) {\n  return 0;\n}",
    "tests": [
      {
        "key": "grandTotal",
        "args": [
          17.9,
          2.9,
          3
        ],
        "expected": 17.8
      },
      {
        "key": "grandTotal",
        "args": [
          23.3,
          0,
          0
        ],
        "expected": 23.3
      },
      {
        "key": "grandTotal",
        "args": [
          0,
          0,
          0
        ],
        "expected": 0
      }
    ]
  },
  {
    "title": "Une dernière vérification",
    "chapter": 5,
    "kind": "QUIZ",
    "time": 5,
    "concept": "Teste aussi les cas qui ne doivent pas marcher.",
    "explanation": "Un code promo ne doit pas être accepté dans toutes les situations.",
    "task": "Un panier reste sous ton minimum de promotion. Le client saisit ton bon code. Que doit renvoyer discount ?",
    "hint": "Les deux conditions reliées par && doivent être vraies.",
    "options": [
      "La réduction, car le code est correct.",
      "0, car ton minimum n’est pas atteint.",
      "Le montant du panier."
    ],
    "answer": 1,
    "why": "Même avec le bon code, ton minimum doit être atteint. La réduction vaut donc zéro.",
    "seed": "",
    "tests": []
  },
  {
    "title": "Fais tester ton restaurant",
    "chapter": 5,
    "kind": "TEST FINAL",
    "time": 11,
    "concept": "Un parcours complet, comme une équipe de développement.",
    "explanation": "Ta carte, ton ambiance et tes règles sont maintenant réunies. Échange avec un camarade : peut-il commander dans ton restaurant et expliquer ta promotion ?",
    "task": "Compose une commande qui atteint ton seuil de livraison offerte ET ton minimum de promotion. Applique ton code, confirme, puis montre ton appli à un camarade. Comparez vos cartes et vos règles. Ajoute ta dernière touche avec Mon style, puis télécharge ton application avec Mon appli.",
    "hint": "Le panier affiche tes conditions. Ajoute des articles pour atteindre le plus élevé de tes deux seuils, puis saisis ton code personnel.",
    "seed": "",
    "tests": [],
    "practice": "order",
    "outcome": "Mon restaurant fonctionne et je repars avec mon application hors ligne."
  }
];

export const chapters = [
  "01 · L’écran réagit",
  "02 · Un bug à réparer",
  "03 · Le panier calcule",
  "04 · Les règles de livraison",
  "05 · Le bon prix",
  "06 · Prêt à commander"
];

export const solution = "const cuisine = \"burger\";\nconst theme = \"sunset\";\nconst menuLayout = \"list\";\nconst mainName = \"Le Smash du coin\";\nconst mainPrice = 9.9;\nconst sideName = \"Frites bien dorées\";\nconst sidePrice = 4.5;\nconst drinkName = \"La pause fraîche\";\nconst drinkPrice = 3.5;\nconst deliveryPrice = 2.9;\nconst freeDeliveryAt = 20;\nconst promoCode = \"MIAM\";\nconst promoMinimum = 15;\nconst promoValue = 3;\nconst restaurantName = \"Juvign’Burger\";\nfunction addQuantity(quantity) { return quantity + 1; }\nfunction removeQuantity(quantity) { if (quantity === 0) return 0; return quantity - 1; }\nfunction lineTotal(unitPrice, quantity) { return unitPrice * quantity; }\nfunction subtotal(first, second, third) { return first + second + third; }\nfunction deliveryFee(amount) { if (amount >= freeDeliveryAt) return 0; return deliveryPrice; }\nfunction discount(code, amount) { if (code === promoCode && amount >= promoMinimum) return promoValue; return 0; }\nfunction grandTotal(amount, fee, reduction) { return amount + fee - reduction; }";
