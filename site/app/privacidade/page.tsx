import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Política de Privacidade — people4people",
};

export default function Privacidade() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <span className="inline-block rounded-full bg-violet-600/10 px-3 py-1 text-xs font-medium text-violet-700">
          Legal
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-stone-500">Última atualização: 4 de outubro de 2026</p>

        <div className="legal-content mt-8">
          <h2>1. Introdução</h2>
          <p>
            Esta Política de Privacidade explica como a people4people recolhe, utiliza e protege
            os dados pessoais de quem visita este site, pede uma demonstração ou utiliza a
            aplicação SGRH. Respeitamos o Regulamento Geral sobre a Proteção de Dados (RGPD) e a
            legislação portuguesa aplicável.
          </p>

          <h2>2. Responsável pelo tratamento de dados</h2>
          <p>
            O responsável pelo tratamento dos dados recolhidos através deste site é a{" "}
            <strong>[nome legal da empresa]</strong>, pessoa coletiva n.º{" "}
            <strong>[NIPC]</strong>, com sede em <strong>[morada da sede]</strong>.
          </p>

          <h2>3. Que dados pessoais recolhemos</h2>
          <p>Consoante a forma como interage connosco, podemos recolher:</p>
          <ul>
            <li>Dados de contacto que nos fornece voluntariamente (nome, email, empresa, mensagem) ao pedir uma demonstração;</li>
            <li>Dados técnicos de navegação recolhidos automaticamente (endereço IP, tipo de navegador, páginas visitadas), quando aplicável;</li>
            <li>
              Dados dos colaboradores das empresas clientes, tratados exclusivamente dentro da
              aplicação SGRH, por conta e sob instruções dessas empresas (ver secção 4).
            </li>
          </ul>

          <h2>4. Para que finalidades usamos os seus dados</h2>
          <p>Utilizamos os dados pessoais recolhidos para:</p>
          <ul>
            <li>Responder a pedidos de contacto e demonstração;</li>
            <li>Prestar e manter o serviço SGRH às empresas que o contratam;</li>
            <li>Cumprir obrigações legais e contratuais;</li>
            <li>Melhorar este site e a aplicação SGRH.</li>
          </ul>
          <p>
            Dentro da aplicação SGRH, a people4people atua como subcontratante (processador) dos
            dados dos colaboradores inseridos pelas empresas clientes, que permanecem responsáveis
            pelo tratamento desses dados nos termos do respetivo contrato de prestação de serviços.
          </p>

          <h2>5. Base legal do tratamento</h2>
          <p>
            Tratamos os dados com base na execução de um contrato (ou diligências pré-contratuais,
            como um pedido de demonstração), no cumprimento de obrigações legais e, quando
            aplicável, no consentimento que nos dá.
          </p>

          <h2>6. Partilha de dados com terceiros</h2>
          <p>
            Não vendemos dados pessoais a terceiros. Podemos partilhar dados com prestadores de
            serviços que nos apoiam na operação do site e da aplicação (por exemplo, alojamento e
            infraestrutura técnica), sempre sob obrigações contratuais de confidencialidade e
            segurança, e apenas na medida necessária para prestar o serviço.
          </p>

          <h2>7. Prazo de conservação</h2>
          <p>
            Conservamos os dados de contacto enquanto durar a relação connosco e, após o seu
            termo, pelo prazo necessário para cumprir obrigações legais ou defender direitos em
            processo judicial. Os dados tratados dentro do SGRH são conservados nos termos
            acordados com cada empresa cliente.
          </p>

          <h2>8. Os seus direitos</h2>
          <p>Nos termos do RGPD, tem direito a:</p>
          <ul>
            <li>Aceder aos seus dados pessoais;</li>
            <li>Solicitar a sua retificação ou atualização;</li>
            <li>Solicitar o apagamento dos dados, quando aplicável;</li>
            <li>Solicitar a limitação ou opor-se ao tratamento;</li>
            <li>Solicitar a portabilidade dos dados;</li>
            <li>Apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD).</li>
          </ul>
          <p>
            Para exercer qualquer um destes direitos, contacte-nos através de{" "}
            <strong>[email dedicado a privacidade, ex.: privacidade@people4people.pt]</strong>.
          </p>

          <h2>9. Segurança da informação</h2>
          <p>
            Adotamos medidas técnicas e organizativas adequadas para proteger os dados pessoais
            contra acesso não autorizado, perda ou divulgação indevida.
          </p>

          <h2>10. Cookies e tecnologias semelhantes</h2>
          <p>
            Este site pode utilizar cookies técnicos estritamente necessários ao seu
            funcionamento. Não utilizamos cookies de publicidade ou de rastreio de terceiros sem
            o seu consentimento prévio.
          </p>

          <h2>11. Alterações a esta política</h2>
          <p>
            Podemos atualizar esta política periodicamente. A data da última atualização está
            indicada no topo desta página.
          </p>

          <h2>12. Contacte-nos</h2>
          <p>
            Para qualquer questão sobre esta política ou sobre o tratamento dos seus dados
            pessoais, contacte-nos em{" "}
            <a href="mailto:geral@people4people.pt">geral@people4people.pt</a>.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
