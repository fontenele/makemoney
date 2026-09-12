# Crypto Trader — Project Context & Technical Roadmap

> Este documento é a fonte principal de contexto do projeto.
>
> Antes de implementar qualquer funcionalidade relevante, leia este documento e o `AGENTS.md`.
>
> O projeto deve evoluir incrementalmente. Não implemente milestones futuras antecipadamente.

## Status verified on 2026-09-12

```text
M0 Bootstrap:             DONE
M1 Market Data:           DONE (M1.1 through M1.8)
M2 Paper Wallet:          DONE
M2.1 Paper Wallet Core:   DONE
M2.2 Portfolio Valuation: DONE
M2.3 Read-only API:       DONE
M2.4 Stale Price Guard:   DONE
M2.5 Persistence:         DONE
M3.1 Buy Quote:           DONE
M3.2 Buy Execution:       DONE
M3.3 Sell Quote:          DONE
M3.4 Sell Execution:      DONE
M3.5 Execution History:   DONE
M3.6 Position/PnL:        DONE
M3.7 Unrealized PnL:      DONE
M3.8 Performance Summary: DONE
M3 Paper Trading:        DONE
M4.1 Max Order Notional: DONE
M4.2 Emergency Stop:     DONE
M4.3 BTC Position Limit: DONE
M4.4 Atomic Exposure:    DONE
M4.5 Daily Loss Limit:   DONE
Next increment:           NOT APPROVED
```

The detailed sections below preserve the original product plan. For current delivery status and exact increment boundaries, `docs/roadmap.md` and `docs/current-state.md` are authoritative.

---

# 1. Visão do Projeto

Crypto Trader é um projeto pessoal/local para estudar, monitorar, simular e futuramente executar operações automatizadas em mercados de criptomoedas.

O projeto começou com uma pergunta simples:

> Se eu comprar Bitcoin a 77k e vender a 79k, considerando as taxas, ainda existe lucro?

A partir disso surgiu a ideia de construir um sistema capaz de responder essa pergunta automaticamente e de forma muito mais completa.

O sistema deverá considerar não apenas:

```text
sellPrice > buyPrice
```

mas o resultado econômico real da operação:

```text
Net PnL =
    Sale Proceeds
    - Acquisition Cost
    - Trading Fees
    - Spread
    - Slippage
    - Network/Gas Costs (quando aplicável)
    - Other Execution Costs
```

A intenção NÃO é criar imediatamente um bot que "aposta" dinheiro.

A intenção é construir uma pequena plataforma quantitativa de trading capaz de:

1. observar mercados;
2. coletar dados;
3. detectar oportunidades;
4. simular operações;
5. medir resultados;
6. testar hipóteses;
7. gerenciar risco;
8. fazer backtesting;
9. somente depois executar operações reais.

---

# 2. Objetivo principal

Queremos responder objetivamente:

> Existe alguma estratégia simples e reproduzível que apresente expectativa matemática positiva depois de todos os custos?

Não queremos responder isso olhando gráficos manualmente.

Queremos responder usando dados.

O sistema deve permitir eventualmente comparar estratégias através de métricas como:

```text
Trades
Wins
Losses
Win Rate
Gross PnL
Net PnL
Fees
ROI
Maximum Drawdown
Profit Factor
Expectancy
Sharpe/Sortino (futuramente, se fizer sentido)
```

Win rate isoladamente NÃO é suficiente.

Uma estratégia pode acertar 80% das operações e ainda perder dinheiro.

---

# 3. Filosofia do projeto

A ordem correta é:

```text
OBSERVAR
   ↓
COLETAR
   ↓
SIMULAR
   ↓
MEDIR
   ↓
BACKTEST
   ↓
VALIDAR
   ↓
CONTROLAR RISCO
   ↓
EXECUTAR COM VALOR MÍNIMO
   ↓
ESCALAR APENAS SE HOUVER EVIDÊNCIA
```

Nunca:

```text
"parece que sobe"
      ↓
    BUY
```

---

# 4. Capital

## Paper Trading

Capital inicial fictício sugerido:

```text
R$ 1.000
```

Esse valor deve ser configurável.

O motivo de usar capital fictício maior que o capital real é permitir centenas/milhares de operações simuladas sem limitações artificiais.

---

## Trading real

Capital real inicial planejado:

```text
R$ 10
```

Inicialmente cogitou-se R$50, mas a decisão atual é começar com apenas R$10.

Esse valor NÃO representa uma tentativa de obter retorno financeiro relevante.

Ele serve para validar:

```text
paper execution
       vs
real execution
```

Principalmente:

- taxas reais;
- slippage;
- mínimos;
- arredondamento;
- latência;
- comportamento das ordens;
- integração;
- segurança.

Se R$10 for insuficiente por causa de minimum order, gas ou outros custos, NÃO aumentar automaticamente.

Primeiro medir e entender o motivo.

---

# 5. Patrimônio pessoal do usuário

Existe uma conta Binance pessoal com ativos anteriores.

REGRA ABSOLUTA:

> O bot NÃO deve acessar, negociar ou depender dos ativos pessoais existentes.

O patrimônio pessoal deve permanecer completamente separado do experimento.

---

# 6. Binance Agentic Wallet

Foi criada pelo aplicativo oficial Binance uma carteira específica para o projeto:

```text
Binance Agentic Wallet
```

Estado atual:

```text
Created:             YES
Balance:             R$0
Connected to bot:    NO
Real trading:        NO
```

Ela foi criada especificamente para o Crypto Trader.

O aplicativo oferece posteriormente:

```text
"Usar Meu Próprio AI Agent"
```

Essa integração ainda NÃO foi realizada.

A Agentic Wallet deve permanecer com:

```text
R$0
```

durante as primeiras milestones.

---

# 7. Agentic Wallet != Binance Spot

Não assumir que Binance Agentic Wallet é simplesmente uma segunda conta Spot.

Precisamos tratar separadamente conceitos como:

```text
Exchange trading
On-chain trading
Wallet
Swap
Spot order
Network
Gas
Service fees
```

Quando chegarmos à integração real, consultar a documentação OFICIAL E ATUAL da Binance.

Precisamos avaliar:

- API/SDK disponível;
- autenticação;
- autorização;
- permissões;
- redes suportadas;
- tokens suportados;
- swaps;
- market orders;
- limit orders;
- fees;
- gas;
- slippage;
- limites;
- modelo de segurança;
- integração com agentes;
- Agent OS / MCP, se aplicável.

Nada disso deve ser assumido antecipadamente.

---

# 8. Stack decidida

Backend:

```text
Node.js 24 LTS
TypeScript
NestJS
```

Persistência:

```text
PostgreSQL
Prisma
```

Infraestrutura auxiliar:

```text
Redis
Docker
Docker Compose
```

Frontend posteriormente:

```text
Vue 3
Vite
Tailwind CSS
```

Charts posteriormente:

```text
TradingView Lightweight Charts
```

---

# 9. Por que Node.js

O projeto envolve principalmente:

- WebSockets;
- streams;
- APIs externas;
- eventos;
- market data;
- I/O concorrente;
- integração com diferentes providers.

Node.js/TypeScript foi escolhido por ser adequado para esse perfil e permitir desenvolvimento rápido.

Não significa que Java seja tecnicamente incapaz.

É uma decisão pragmática para este projeto.

---

# 10. Arquitetura

NÃO usar microservices neste momento.

Arquitetura:

```text
MODULAR MONOLITH
```

Queremos separação clara de responsabilidades sem complexidade operacional desnecessária.

Conceitualmente:

```text
              MARKET PROVIDERS
                     │
         ┌───────────┴───────────┐
         │                       │
      Binance               Polymarket
      (first)                (future)
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
              MARKET DATA
                     │
                     ▼
               MARKET ENGINE
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
   STRATEGY ENGINE       OPPORTUNITY SCANNER
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
                 SIGNAL
                     │
                     ▼
                RISK ENGINE
                     │
               ┌─────┴─────┐
               │           │
             REJECT      APPROVE
                           │
                           ▼
                    TRADING EXECUTOR
                     ┌─────┴─────┐
                     │           │
                   PAPER        REAL
                     │           │
                     ▼           ▼
                Paper Wallet   Provider
```

---

# 11. Providers

Nunca acoplar o domínio diretamente à Binance.

Queremos abstrações.

Exemplo conceitual:

```ts
interface MarketProvider {
    getTicker(symbol: string): Promise<Ticker>;

    getOrderBook(symbol: string): Promise<OrderBook>;

    getCandles(
        symbol: string,
        interval: CandleInterval
    ): Promise<Candle[]>;

    subscribeTrades(
        symbol: string
    ): AsyncIterable<MarketTrade>;
}
```

Possíveis implementações:

```text
BinanceMarketProvider
PolymarketMarketProvider
```

Mas NÃO forçar Polymarket a implementar conceitos que não façam sentido.

Prediction markets possuem domínio diferente.

---

# 12. Trading Executor

Estratégias nunca devem saber se estão operando dinheiro real ou fictício.

Conceitualmente:

```ts
interface TradingExecutor {
    buy(order: BuyOrder): Promise<Execution>;

    sell(order: SellOrder): Promise<Execution>;
}
```

Implementações:

```text
PaperTradingExecutor
RealTradingExecutor
```

Assim:

```text
Strategy
   ↓
Signal
   ↓
Risk Engine
   ↓
TradingExecutor
```

e não:

```text
Strategy
   ↓
Binance.buy()
```

---

# 13. Market Data

Primeiro provider:

```text
Binance
```

Primeira integração:

```text
PUBLIC DATA ONLY
```

Sem:

- login;
- API key;
- wallet;
- ordem;
- autenticação.

Inicialmente coletar:

```text
ticker
trades
candles
volume
order book
spread
trading pair metadata
```

Preferencialmente WebSocket onde apropriado.

REST pode ser usado para snapshots/metadados.

---

# 14. Bootstrap status

## M0 — Bootstrap

M0 JÁ FOI EXECUTADO.

NÃO REFAZER M0.

Antes de continuar, inspecionar o que existe atualmente no repositório.

Validar:

```text
NestJS
PostgreSQL
Redis
Prisma
Docker
Docker Compose
TypeScript
lint
format
tests
.env.example
.gitignore
AGENTS.md
README
```

Não assumir que M0 está perfeito.

Corrigir apenas problemas encontrados.

---

# 15. M1 — Market Data

STATUS: COMPLETE through M1.8.

Objetivo:

> Receber market data real público da Binance.

Primeiro símbolo:

```text
BTC/USDT
```

Nenhuma carteira.

Nenhuma ordem.

Nenhuma estratégia.

Nenhum dinheiro.

Nenhuma Agentic Wallet.

---

# 16. Primeiro vertical slice

Evitar construir uma infraestrutura enorme antes de vermos dados.

Primeiro vertical slice:

```text
Binance public WebSocket
        ↓
BinanceMarketProvider
        ↓
Normalize event
        ↓
Market Data Service
        ↓
Application
        ↓
Console
```

Resultado esperado:

```text
20:32:01 BTC/USDT $77,341.20
20:32:02 BTC/USDT $77,342.80
20:32:02 BTC/USDT $77,339.41
20:32:03 BTC/USDT $77,351.13
```

Os valores acima são apenas exemplos.

Devem vir do mercado real.

---

# 17. Critério de aceite M1 — primeira etapa

Considerar a primeira etapa do M1 concluída quando:

- conexão pública Binance funciona;
- BTC/USDT recebe atualizações;
- dados são normalizados para modelo interno;
- provider Binance está encapsulado;
- reconnect básico existe;
- erros não derrubam silenciosamente a aplicação;
- shutdown fecha conexão corretamente;
- existem testes onde fizer sentido;
- nenhuma credencial Binance é necessária.

Somente depois evoluir para candles/order book/etc.

---

# 18. Paper Wallet — M2

Depois do Market Data.

Criar uma carteira fictícia.

Exemplo:

```text
BRL       R$10
USDT      R$20
BTC       R$15
SOL       R$5

TOTAL     R$50
```

Não confundir Paper Wallet com Binance Agentic Wallet.

Paper Wallet existe somente no nosso sistema.

Saldo inicial configurável.

---

# 19. Decimal arithmetic

REGRA IMPORTANTE.

Dinheiro não deve depender ingenuamente de:

```ts
number
```

para cálculos financeiros sensíveis.

Problema clássico:

```ts
0.1 + 0.2 !== 0.3
```

Escolher abordagem segura para:

- preços;
- quantidade;
- fees;
- balances;
- PnL;
- position sizing.

Avaliar biblioteca decimal adequada quando chegarmos aos cálculos financeiros.

Não adicionar dependência antecipadamente sem necessidade.

---

# 20. Paper Trading — M3

Paper trading deve utilizar mercado REAL com dinheiro FICTÍCIO.

Uma operação simulada deve reproduzir realisticamente:

- preço disponível;
- spread;
- maker/taker fee;
- slippage;
- liquidity;
- precision;
- tick size;
- lot size;
- minimum order;
- rounding.

Quando aplicável:

- network fee;
- gas;
- service fee.

---

# 21. Exemplo de PnL

Exemplo conceitual:

```text
Investment        R$10.00
Gross Sale        R$10.26

Trading fees      R$ 0.02
Spread cost       R$ 0.01
Slippage          R$ 0.01

Net Result        R$10.22
Net PnL           R$ 0.22
ROI                2.20%
```

Não apresentar:

```text
10 → 10.26 = +2.6%
```

se na realidade os custos reduzem o retorno.

---

# 22. Cost Ratio

Operações pequenas podem ser economicamente inviáveis.

Exemplo:

```text
Order = R$2
Costs = R$0.20

Cost ratio = 10%
```

Mesmo que tecnicamente seja possível executar, provavelmente deve ser rejeitada.

Conceitualmente:

```ts
if (estimatedCosts.div(orderValue).gt(MAX_COST_RATIO)) {
    return RiskDecision.REJECT;
}
```

Isso será responsabilidade do Risk Engine.

---

# 23. Risk Engine — M4

Nenhuma estratégia pode executar ordem diretamente.

Sempre:

```text
Strategy
   ↓
Signal
   ↓
Risk Engine
   ↓
APPROVED / REJECTED
```

O Risk Engine deverá evoluir para avaliar:

```text
balance
position size
total exposure
estimated fees
spread
slippage
liquidity
minimum order
precision
stop loss
take profit
daily loss
drawdown
number of positions
cost ratio
provider availability
```

---

# 24. Proteções reais

Para trading real, futuramente teremos algo conceitual como:

```env
TRADING_MODE=paper

REAL_TRADING_ENABLED=false

REAL_CAPITAL_BRL=10

WITHDRAWALS_ENABLED=false
FUTURES_ENABLED=false
LEVERAGE_ENABLED=false
```

Porém alterar uma única variável NÃO deve ser suficiente para disparar operações reais.

Queremos múltiplas barreiras.

---

# 25. Regras absolutas

Inicialmente:

```text
FUTURES        ❌
MARGIN         ❌
LEVERAGE       ❌
WITHDRAWALS    ❌
```

Nenhuma dessas funcionalidades faz parte do MVP.

---

# 26. Kill Switch

Real trading deverá possuir:

```text
EMERGENCY STOP
```

Quando acionado:

```text
NO NEW ORDERS
```

O comportamento sobre posições existentes deverá ser explicitamente definido antes da implementação.

Nunca assumir automaticamente "vender tudo".

---

# 27. Strategy Engine — M5

Depois que market data, paper wallet, paper trading e risk engine estiverem sólidos.

Interface conceitual:

```ts
interface Strategy {
    analyze(
        market: MarketSnapshot
    ): Promise<StrategySignal>;
}
```

Signal pode conter:

```ts
{
    action: 'BUY',
    confidence: 0.73,
    expectedReturn: ...,
    stopLoss: ...,
    takeProfit: ...,
    reason: ...
}
```

Não é obrigatório seguir exatamente esse DTO.

---

# 28. Estratégias candidatas

Possíveis estratégias:

```text
Trend
Mean Reversion
Breakout
Volume Spike
New Listing
Arbitrage
```

Não implementar todas simultaneamente.

Uma estratégia por vez.

Cada uma precisa:

```text
hypothesis
rules
parameters
tests
backtest
metrics
```

---

# 29. IA

NÃO começar usando LLM para decidir:

```text
BUY
SELL
```

Primeiro queremos estratégias:

```text
deterministic
reproducible
measurable
backtestable
```

Posteriormente IA pode ajudar em:

```text
news classification
sentiment
context
anomaly classification
signal enrichment
```

Mas deverá ser comparada contra baseline determinístico.

---

# 30. New Listing Scanner — M7

Uma das ideias que originaram o projeto foi:

> "Moedas novas normalmente têm uma subida forte quando são lançadas/listadas e depois caem."

Isso é uma HIPÓTESE.

Não uma regra.

O sistema deverá tentar verificar estatisticamente se existe edge.

---

# 31. Dados de New Listings

Quando detectarmos um listing, queremos eventualmente acompanhar:

```text
T+0
T+5s
T+10s
T+30s
T+1m
T+5m
T+15m
T+1h
T+24h
```

Registrando:

```text
price
volume
spread
order book
liquidity
volatility
high
low
drawdown
```

---

# 32. Perguntas do New Listing Research

Queremos conseguir responder:

```text
Quantos listings foram analisados?

Quantos tiveram pump?

Qual foi a mediana do pump?

Quanto tempo demorou?

Quantos corrigiram?

Qual tamanho da correção?

Em quanto tempo?

Qual era o spread inicial?

Qual era a liquidez?

Qual estratégia teria sido lucrativa
depois das taxas e slippage?
```

Só depois considerar execução automática.

---

# 33. Backtesting — M6

Backtest deve responder:

> Se essa estratégia tivesse operado esse período histórico, o que teria acontecido?

Exemplo:

```text
Trades              1,842
Wins                 1,061
Losses                 781

Win Rate             57.6%

Gross PnL            ...
Fees                 ...
Net PnL              ...

Initial Capital      R$50
Final Capital        R$63.21

ROI                  +26.42%

Maximum Drawdown     -8.7%

Profit Factor        ...
Expectancy           ...
```

Números acima são exemplos.

---

# 34. Backtest realista

Evitar look-ahead bias.

Evitar usar informação futura inadvertidamente.

Considerar:

- fees;
- execution assumptions;
- spread;
- slippage;
- liquidity;
- candle granularity;
- missing data.

Se um backtest estiver excessivamente bom, assumir inicialmente que pode haver bug ou bias.

---

# 35. Opportunity Scanner

Antes de deixar o sistema operar sozinho, queremos que ele seja capaz de apenas apontar oportunidades.

Exemplo:

```text
SOL/USDT

Entry             $142.32
Target            $145.48
Stop              $140.91

Gross Potential    +2.22%
Fees               -0.20%
Slippage Est.      -0.08%

Net Potential      +1.94%

Risk               MEDIUM
Confidence         78%

Reason
Volume breakout + price momentum
```

O scanner deve explicar a origem do sinal.

---

# 36. Dashboard — M8

Frontend futuro.

Possível dashboard:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTFOLIO
━━━━━━━━━━━━━━━━━━━━━━━━━━

R$54.72

Today       +R$0.83
7 days      +R$3.12
Total       +R$4.72

━━━━━━━━━━━━━━━━━━━━━━━━━━
OPEN POSITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━

BTC         +1.32%
SOL         -0.41%
XYZ         +3.83%

━━━━━━━━━━━━━━━━━━━━━━━━━━
BOT
━━━━━━━━━━━━━━━━━━━━━━━━━━

Status      ONLINE

Trades      7
Wins        5
Losses      2
Win Rate    71.4%
```

Também:

```text
equity curve
PnL
drawdown
strategy performance
asset performance
trade history
opportunities
```

---

# 37. Polymarket — M9

Polymarket foi discutido como possível expansão.

Mas prediction markets NÃO são simplesmente outra cryptocurrency exchange.

Conceitos incluem:

```text
market
outcome
YES
NO
probability
resolution
settlement
liquidity
order book
```

Não modelar isso artificialmente como:

```text
BTC/USDT
```

Criar domínio adequado quando chegar a hora.

---

# 38. Possível valor do Polymarket

Futuramente pode ser usado para estudar:

- probability markets;
- divergência de probabilidades;
- arbitragem;
- information edge;
- mercados correlacionados.

Não implementar no estágio atual.

---

# 39. Arbitragem

Outra direção possível é procurar oportunidades onde o edge seja mais matemático do que direcional.

Exemplo conceitual:

```text
Market A price
vs
Market B price
```

ou mercados relacionados.

Mas sempre considerar:

```text
fees
transfer time
liquidity
slippage
execution risk
settlement risk
```

Uma diferença de preço não implica automaticamente arbitragem executável.

---

# 40. Segurança

Segurança é parte do domínio, não uma feature opcional.

Nunca colocar no Git:

```text
API keys
API secrets
private keys
seed phrases
wallet recovery data
authentication tokens
```

Usar:

```text
.env
```

com:

```text
.env.example
```

sem segredos.

---

# 41. Logging

Logs devem ser estruturados.

Futuramente registrar:

```text
market event
signal
risk decision
order intent
execution
provider response
position change
PnL
system error
circuit breaker
```

Mas nunca registrar secrets.

---

# 42. Audit trail

Uma operação deverá futuramente permitir reconstruir:

```text
Why did the bot buy?

Which strategy generated the signal?

What data existed at that moment?

What did the Risk Engine decide?

What order was requested?

What did the provider execute?

What fees were paid?

What was the final PnL?
```

Isso será extremamente importante quando dinheiro real entrar.

---

# 43. Idempotência

Ordens reais precisam ser idempotentes quando possível.

Exemplo de problema:

```text
send BUY
   ↓
timeout
   ↓
retry
   ↓
BUY again
```

O sistema não pode simplesmente duplicar uma ordem porque perdeu a resposta HTTP.

Projetar isso quando chegarmos à execução.

---

# 44. Resiliência

Market providers precisam considerar:

```text
disconnect
reconnect
rate limit
timeout
malformed event
API unavailable
partial outage
stale data
```

Nunca assumir conexão eterna.

---

# 45. Stale Market Data

Uma estratégia não deve operar usando dados antigos porque o WebSocket caiu.

Precisaremos eventualmente representar:

```text
lastMarketUpdate
marketDataAge
providerHealth
```

Risk Engine poderá rejeitar operações se market data estiver stale.

---

# 46. Domínio provável

Conceitos previstos:

```text
Asset
TradingPair

Market
Exchange

Ticker
Candle
OrderBook
MarketTrade

Portfolio
Wallet
Balance
Position

Order
Execution
Trade

Strategy
Signal
Opportunity

RiskRule
RiskAssessment

Backtest
BacktestRun
BacktestResult
```

Não criar todos agora.

YAGNI.

Adicionar conforme o domínio exigir.

---

# 47. Princípios de engenharia

Preferências:

```text
TypeScript strict
English names in code
small cohesive modules
explicit domain concepts
dependency inversion
testable code
external providers encapsulated
configuration validation
structured errors
structured logs
```

SOLID quando útil.

Não aplicar padrões apenas por formalidade.

---

# 48. Evitar overengineering

NÃO precisamos agora de:

```text
Kafka
Kubernetes
microservices
event sourcing
CQRS completo
service mesh
distributed tracing complexo
```

Redis/PostgreSQL/NestJS são suficientes.

Se no futuro surgir necessidade concreta, reavaliar.

---

# 49. Persistência

PostgreSQL será a fonte persistente principal.

Redis pode ser utilizado para:

```text
cache
ephemeral state
locks
queues
rate limiting
```

Não utilizar Redis como fonte permanente de informação financeira importante.

---

# 50. Prisma

Prisma foi escolhido como ORM.

Não criar schema gigantesco antecipadamente.

Cada milestone adiciona apenas o necessário.

Migrations devem acompanhar alterações relevantes.

---

# 51. Testes

Regras financeiras precisam de testes fortes.

Prioridade especialmente alta:

```text
fees
PnL
position sizing
slippage
rounding
precision
minimum order
risk limits
stop loss
take profit
daily loss
drawdown
```

---

# 52. Unit tests

Domínio deve ser testável sem:

```text
Binance
PostgreSQL
Redis
Internet
```

Quando possível, regras puras devem ser unit tests.

---

# 53. Integration tests

Usar integration tests para:

```text
database
provider adapters
repositories
WebSocket parsing
external protocol handling
```

Não transformar todos os testes em integration tests.

---

# 54. Trading Modes

O sistema deverá eventualmente possuir modos explícitos:

```text
MARKET_DATA
PAPER
REAL
```

ou modelo equivalente.

Modo padrão deverá ser seguro.

Algo equivalente a:

```text
TRADING_MODE=paper
```

Nunca `real` por default.

---

# 55. Real Trading — M10

É a última milestone planejada atualmente.

Pré-condições:

```text
Market Data stable
Paper Wallet stable
Paper Trading stable
Risk Engine stable
Strategies tested
Backtesting available
Observability adequate
Audit trail available
Kill switch available
Provider integration understood
```

Só então conectar Agentic Wallet.

---

# 56. Primeira operação real

Quando chegar o momento:

```text
Capital = R$10
```

E ainda assim não significa colocar R$10 em uma única ordem.

Primeiro verificar:

```text
minimum order
fees
gas
service fee
spread
slippage
network
liquidity
```

Se o custo tornar R$10 inviável, informar isso.

Não aumentar capital automaticamente.

---

# 57. Bankroll

Uma ideia discutida foi tratar os R$10 como bankroll experimental.

Evitar comportamento:

```text
bot lost R$10
→ deposit another R$10
→ lost
→ deposit again
```

Isso mascara estratégia ruim.

Se perder o bankroll, parar e analisar.

---

# 58. Milestones oficiais

Roadmap:

```text
M0 — Bootstrap                    DONE
M1 — Market Data                  DONE
M2 — Paper Wallet                 DONE (M2.1–M2.5)
M3 — Paper Trading                DONE (M3.1–M3.8)
M4 — Risk Engine                  IN PROGRESS (M4.1–M4.5 DONE)
M5 — Strategies                   PLANNED
M6 — Backtesting                  PLANNED
M7 — New Listing Scanner          PLANNED
M8 — Dashboard                    PLANNED
M9 — Polymarket                   PLANNED
M10 — Agentic Wallet / Real Trading PLANNED
```

---

# 59. Regra de milestone

Não avançar simplesmente porque "o código compila".

Cada milestone deve possuir:

```text
Goal
Scope
Non-goals
Architecture impact
Implementation plan
Tests
Acceptance criteria
Known limitations
```

Ao concluir:

```text
What was implemented?
What was tested?
What remains?
What changed architecturally?
```

---

# 60. M1 detalhado

M1 deve ser desenvolvido incrementalmente.

## M1.1 — Public Trades

Objetivo:

```text
BTC/USDT live trades
```

Binance WebSocket público.

Normalizar payload Binance para domínio interno.

---

## M1.2 — Ticker

Adicionar:

```text
best bid
best ask
last price
volume
```

---

## M1.3 — Spread

Calcular:

```text
spread = ask - bid
```

e:

```text
spreadPercent
```

Isso será necessário posteriormente para estimar custo real.

---

## M1.4 — Candles

Adicionar OHLCV:

```text
open
high
low
close
volume
openTime
closeTime
```

---

## M1.5 — Order Book

Snapshot + updates, se necessário.

Não implementar um order book sofisticado antes de existir necessidade.

---

## M1.6 — Pair Metadata

Precisaremos posteriormente conhecer regras como:

```text
tick size
step size
minimum quantity
minimum notional
precision
status
```

Esses dados serão importantes para paper trading realista.

---

# 61. Persistência de Market Data

Não começar salvando cada tick indefinidamente.

Isso pode gerar enorme volume de dados.

Primeiro decidir o que realmente precisamos persistir.

Provavelmente:

```text
candles
selected snapshots
listing research data
```

Raw tick/trade storage deve ser decisão consciente.

---

# 62. Market Data interno

Provider payload não deve vazar para o domínio.

Evitar:

```ts
function strategy(
    event: BinanceWebSocketTradeEvent
)
```

Preferir:

```ts
function strategy(
    trade: MarketTrade
)
```

O adapter Binance faz:

```text
Binance payload
      ↓
normalization
      ↓
MarketTrade
```

---

# 63. Time

Trading depende fortemente de tempo.

Internamente preferir timestamps inequívocos.

Evitar lógica financeira dependente de timezone local.

Persistir timestamps em UTC.

Frontend pode converter para timezone do usuário.

---

# 64. Configuração

Config deve ser validada na inicialização.

Exemplo:

```text
DATABASE_URL
REDIS_URL
TRADING_MODE
```

Aplicação não deve iniciar silenciosamente com configuração inválida.

---

# 65. Naming

Código em inglês.

Exemplos:

```text
MarketDataModule
BinanceMarketProvider
MarketTrade
TradingPair
RiskAssessment
PaperTradingExecutor
```

Documentação pode ser português ou inglês conforme conveniente.

---

# 66. Anti-goals atuais

NÃO fazer agora:

```text
real trading
AI trading
futures
leverage
margin
withdrawal automation
complex dashboard
mobile app
microservices
Kubernetes
Polymarket
multiple exchanges
arbitrage engine
new listing trading
```

Eles estão no roadmap, não na milestone atual.

---

# 67. O que queremos evitar

Evitar que o projeto vire:

```text
50 interfaces
80 DTOs
30 repositories
0 market data funcionando
```

Preferimos:

```text
small vertical slice
working
tested
observable
```

e depois evoluir.

---

# 68. Definition of Done

Uma feature financeira só é considerada pronta quando:

```text
implementation exists
tests exist
errors handled
logging adequate
configuration documented
edge cases considered
README/context updated when necessary
```

---

# 69. Como o Codex deve trabalhar

Antes de uma milestone:

1. Ler `AGENTS.md`.
2. Ler `PROJECT_CONTEXT.md`.
3. Inspecionar código atual.
4. Não assumir que documentação == implementação.
5. Comparar estado real do repositório com milestone.
6. Propor plano curto.
7. Implementar incrementalmente.
8. Rodar testes.
9. Relatar resultado.

---

# 70. Não confiar cegamente no contexto

Este documento descreve intenção e arquitetura.

O repositório descreve o estado atual.

Se houver conflito:

```text
1. identificar conflito;
2. explicar;
3. decidir conscientemente;
```

Não sobrescrever código funcional simplesmente para fazer o repositório parecer com este documento.

---

# 71. Decisões abertas

Ainda precisamos decidir futuramente:

```text
decimal arithmetic library
exact market data persistence policy
queue strategy
Redis usage details
paper slippage model
fee model
strategy parameter system
backtesting architecture
Agentic Wallet integration method
Polymarket architecture
frontend component library
deployment target
```

Não tomar todas essas decisões agora.

Tomar quando a milestone exigir.

---

# 72. Historical M1.1 startup plan

STATUS: COMPLETED. This section records the original startup sequence and is no longer the current task.

M0 já foi feito.

Portanto:

```text
DO NOT bootstrap the project again.
```

Agora:

### Step 1

Inspecione:

```text
repository tree
package.json
Nest modules
Prisma schema
docker-compose
env files
AGENTS.md
README
tests
```

### Step 2

Execute testes/lint/build existentes.

### Step 3

Informe resumidamente:

```text
M0 health
technical debt found
anything blocking M1
```

### Step 4

Planeje APENAS:

```text
M1.1 — Binance Public Trades
```

### Step 5

Implemente o menor vertical slice capaz de mostrar:

```text
BTC/USDT live market trades
```

via WebSocket público.

### Step 6

Normalize Binance → internal domain.

### Step 7

Adicione reconnect/shutdown/error handling básico.

### Step 8

Teste.

### Step 9

Mostre o resultado.

Depois pare e avalie antes de seguir para M1.2.

---

# 73. Objetivo do produto em uma frase

> Construir uma plataforma pessoal, segura e orientada por dados para descobrir se estratégias de trading de crypto/prediction markets possuem edge real depois de custos e risco, começando em paper trading e chegando a apenas R$10 de capital real quando o sistema estiver comprovadamente pronto.

---

# 74. Regra final

Quando houver dúvida entre:

```text
more features
```

e:

```text
better measurement
```

prefira:

```text
better measurement
```

Quando houver dúvida entre:

```text
more profit
```

e:

```text
less uncontrolled risk
```

prefira:

```text
less uncontrolled risk
```

Quando houver dúvida entre:

```text
clever architecture
```

e:

```text
simple working architecture
```

prefira:

```text
simple working architecture
```

---

# CURRENT STATE

```text
Project:              Crypto Trader

M0 Bootstrap:         DONE
M1 Market Data:       DONE
M2 Paper Wallet:      DONE
M2.1 Wallet Core:     DONE
M2.2 Valuation:       DONE
M2.3 Read-only API:   DONE
M2.4 Stale Guard:     DONE
M2.5 Persistence:     DONE
M3 Paper Trading:     IN PROGRESS
M3.1 Buy Quote:       DONE
M3.2 Buy Execution:   DONE
M3.3 Sell Quote:      DONE
M3.4 Sell Execution:  DONE
M3.5 Execution History: DONE
M3.6 Position/PnL:     DONE
M3.7 Unrealized PnL:   DONE
M3.8 Performance:      DONE
M3 Paper Trading:      DONE
M4.1 Max Notional:     DONE
M4.2 Emergency Stop:   DONE
M4.3 BTC Position Limit: DONE
M4.4 Atomic Exposure:  DONE
M4.5 Daily Loss Limit: DONE

Binance Account:      EXISTS
Personal assets:      OFF LIMITS

Agentic Wallet:       CREATED
Agentic Balance:      R$0
Agent Connected:      NO

Paper Capital:        1000 USDT configurable; BTC 0
Real Capital:         R$10 planned

Real Trading:         DISABLED
Futures:              DISABLED
Margin:               DISABLED
Leverage:             DISABLED
Withdrawals:          DISABLED

Current task:
No next increment approved.
Stop and present a minimal plan before further implementation.
```
