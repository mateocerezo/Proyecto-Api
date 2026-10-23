// El dinero se opera en centavos con BigInt, nunca con floats.
// Entra y sale como string decimal ("15000.50"), igual que lo devuelve pg.

export const aCentavos = (valor) => {
  const [entera, decimales = ""] = String(valor).split(".");
  return BigInt(entera) * 100n + BigInt(decimales.padEnd(2, "0").slice(0, 2));
};

export const deCentavos = (centavos) => {
  const texto = centavos.toString().padStart(3, "0");
  return `${texto.slice(0, -2)}.${texto.slice(-2)}`;
};
