export function iniciaisPaciente(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return (partes[0]?.[0] ?? "").concat(partes[1]?.[0] ?? "").toUpperCase();
}

export function idadeAnos(dataNascimento: string, hoje = new Date()) {
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() &&
      hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}
