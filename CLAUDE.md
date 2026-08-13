# SYSVEX — convenções para desenvolvimento

## Formulários: Enter para confirmar

Todo campo de entrada do ERP deve suportar confirmar com a tecla **Enter**, como se o usuário tivesse clicado no botão principal da tela (ex.: "Continuar", "Entrar", "Salvar", "Buscar").

Isso já é garantido automaticamente pelo padrão nativo do HTML/React usado em todo o projeto — **não é necessário nenhum listener de teclado manual**. Basta seguir sempre esta estrutura:

```tsx
<form onSubmit={handleSubmit}>
  {/* inputs aqui */}
  <button type="submit">Salvar</button>
</form>

function handleSubmit(e: FormEvent) {
  e.preventDefault();
  // ...
}
```

Regras ao criar uma tela/formulário novo:
- Envolva os campos em um `<form onSubmit={...}>`, nunca em uma `<div>`.
- O botão de ação principal deve ser `type="submit"` dentro desse `form` (não `type="button"` com `onClick`).
- O handler deve começar com `e.preventDefault()`.
- Se a tela tiver múltiplos passos (ex.: login em duas etapas), cada passo deve ter seu próprio `<form onSubmit>`.

Seguindo isso, o Enter funciona automaticamente em qualquer input de texto/senha/busca dentro do `form`, sem código extra — é assim que já funciona em todas as páginas do ERP hoje (login, cadastros de parceiros/produtos, pedidos, financeiro, etc.).
