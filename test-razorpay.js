async function testRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  console.log('Testing Razorpay API...');
  console.log('Key ID:', keyId);
  console.log('Key Secret:', keySecret ? '***' + keySecret.slice(-4) : 'MISSING');
  
  const body = JSON.stringify({ 
    amount: 10000, // ₹100 in paise
    currency: 'INR',
    receipt: 'test_' + Date.now(),
    payment_capture: 1 
  });
  
  try {
    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      },
      body
    });
    
    console.log('Response status:', resp.status);
    
    if (!resp.ok) {
      const text = await resp.text();
      console.error('❌ Error response:', text);
    } else {
      const order = await resp.json();
      console.log('✅ Success! Order created:', order);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testRazorpay();
