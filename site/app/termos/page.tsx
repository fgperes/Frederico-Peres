import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Termos de Utilização — people4people",
};

export default function Termos() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <span className="inline-block rounded-full bg-violet-600/10 px-3 py-1 text-xs font-medium text-violet-700">
          Legal
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Termos de Utilização
        </h1>
        <p className="mt-2 text-sm text-stone-500">Última atualização: 4 de outubro de 2026</p>

        <div className="legal-content mt-8">
          <h2>1. Aceitação dos termos</h2>
          <p>
            Ao aceder a este site ou à aplicação SGRH, concorda com os presentes Termos de
            Utilização. Se não concordar com algum dos termos aqui descritos, não deverá utilizar
            o site nem a aplicação.
          </p>

          <h2>2. Descrição do serviço</h2>
          <p>
            A people4people disponibiliza o SGRH, uma plataforma de software como serviço (SaaS)
            para gestão de recursos humanos, incluindo (sem limitação) gestão de colaboradores,
            horários, picagens, ausências, contratos de trabalho e processamento salarial. O
            acesso à aplicação SGRH por empresas clientes rege-se, adicionalmente, pelo respetivo
            contrato de prestação de serviços.
          </p>

          <h2>3. Utilização aceitável</h2>
          <p>Ao utilizar este site, compromete-se a não:</p>
          <ul>
            <li>Utilizar o site para fins ilícitos ou não autorizados;</li>
            <li>Tentar aceder indevidamente a sistemas, dados ou contas de terceiros;</li>
            <li>Interferir com o funcionamento normal do site ou da aplicação.</li>
          </ul>

          <h2>4. Propriedade intelectual</h2>
          <p>
            Todo o conteúdo deste site — incluindo texto, logótipos, ilustrações e código — é
            propriedade da people4people ou dos seus licenciadores, e está protegido pelas leis
            de propriedade intelectual aplicáveis. Nenhuma parte deste site pode ser reproduzida
            sem autorização prévia por escrito.
          </p>

          <h2>5. Isenção de responsabilidade</h2>
          <p>
            Este site é disponibilizado &ldquo;tal como está&rdquo;. A people4people envida esforços
            razoáveis para manter a informação aqui publicada atualizada e correta, mas não
            garante a ausência de erros ou omissões. O funcionamento específico da aplicação SGRH
            rege-se pelas condições de serviço acordadas com cada empresa cliente.
          </p>

          <h2>6. Alterações aos termos</h2>
          <p>
            Podemos atualizar estes Termos de Utilização periodicamente. A data da última
            atualização está indicada no topo desta página.
          </p>

          <h2>7. Lei aplicável e foro</h2>
          <p>
            Os presentes termos regem-se pela lei portuguesa. Para a resolução de qualquer litígio
            emergente da utilização deste site, é competente o foro da comarca de{" "}
            <strong>[comarca competente]</strong>, com expressa renúncia a qualquer outro.
          </p>

          <h2>8. Contacto</h2>
          <p>
            Para qualquer questão sobre estes termos, contacte-nos em{" "}
            <a href="mailto:geral@people4people.pt">geral@people4people.pt</a>.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
