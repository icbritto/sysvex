import { MouseEvent, ReactNode, useRef } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  // Fecha ao clicar fora do modal, mas só quando o mousedown que iniciou o
  // clique também começou no overlay — evita fechar o modal quando o usuário
  // arrasta o mouse para selecionar texto de um campo e solta o botão fora
  // dos limites do modal (o navegador despacha o "click" resultante
  // diretamente no overlay, ignorando o stopPropagation do conteúdo interno).
  const mouseDownOnOverlay = useRef(false);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    mouseDownOnOverlay.current = e.target === e.currentTarget;
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && mouseDownOnOverlay.current) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
