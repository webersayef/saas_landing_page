// Renders a page's stored sections [{type, data}] — server component.
import OrderForm from './OrderForm';

const wrap = { maxWidth: 760, margin: '0 auto', padding: '26px 20px' };

export default function SectionRenderer({ section, page, product }) {
  const d = section.data || {};
  switch (section.type) {
    case 'hero':
      return (
        <section style={{ ...wrap, textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.3 }}>{d.headline}</h1>
          {d.subtext && <p style={{ fontSize: 18 }}>{d.subtext}</p>}
          {d.imageUrl && <img src={d.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 14 }} />}
          <p><a href="#order" className="btn" style={{ fontSize: 18 }}>{d.ctaText || 'অর্ডার করুন'}</a></p>
        </section>
      );
    case 'offer':
      return (
        <section style={{ ...wrap, textAlign: 'center', background: '#fef3c7', borderRadius: 14 }}>
          <h2>{d.text}</h2>
          <p style={{ fontSize: 22 }}>
            এখন মাত্র <b>৳{d.price}</b>{' '}
            {d.oldPrice > d.price && <s style={{ color: '#b91c1c' }}>৳{d.oldPrice}</s>}
          </p>
          {d.endsAtMidnight && <p className="muted">অফার শেষ হওয়ার আগেই অর্ডার করুন — স্টক সীমিত!</p>}
        </section>
      );
    case 'benefits':
      return (
        <section style={wrap}>
          <h2>{d.title}</h2>
          <ul>{(d.items || []).map((it, i) => <li key={i} style={{ fontSize: 17, margin: '6px 0' }}>✅ {it}</li>)}</ul>
        </section>
      );
    case 'gallery':
      return (
        <section style={wrap}>
          <h2>{d.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            {(d.images || []).map((src, i) => <img key={i} src={src} alt="" style={{ width: '100%', borderRadius: 12 }} />)}
          </div>
        </section>
      );
    case 'howToUse':
      return (
        <section style={wrap}>
          <h2>{d.title}</h2>
          <ol>{(d.steps || []).map((s, i) => <li key={i} style={{ fontSize: 17, margin: '6px 0' }}>{s}</li>)}</ol>
        </section>
      );
    case 'reviews':
      return (
        <section style={wrap}>
          <h2>{d.title}</h2>
          {(d.items || []).map((r, i) => (
            <div className="card" key={i}><b>⭐⭐⭐⭐⭐ {r.name}</b><p style={{ margin: '6px 0' }}>{r.text}</p></div>
          ))}
        </section>
      );
    case 'faq':
      return (
        <section style={wrap}>
          <h2>{d.title}</h2>
          {(d.items || []).map((f, i) => (
            <details key={i} style={{ margin: '8px 0' }}>
              <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      );
    case 'orderForm':
      return (
        <section style={wrap} id="order">
          <h2>{d.title}</h2>
          {product && <p style={{ fontSize: 18 }}>{product.name} — <b>৳{product.price}</b></p>}
          <OrderForm slug={page.slug} buttonText={d.buttonText} />
        </section>
      );
    default:
      return null;
  }
}
