require('dotenv').config();

async function testRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  console.log('Testing Razorpay API...');
  console.log('Key ID:', keyId);
  console.log('Key Secret:', keySecret ? '***' + keySecret.slice(-4) : 'MISSING');
  
  if (!keyId || !keySecret) {
    console.error('❌ Missing Razorpay credentials in .env file');
    return;
  }
  
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
    
    console.log('\nResponse status:', resp.status);
    
    if (!resp.ok) {
      const text = await resp.text();
      console.error('❌ Error response:', text);
      console.log('\n⚠️  This usually means:');
      console.log('1. Your Razorpay account is not activated for live payments');
      console.log('2. You need to complete KYC verification');
      console.log('3. You should use TEST mode keys instead');
      console.log('\nTo get TEST keys:');
      console.log('1. Go to https://dashboard.razorpay.com');
      console.log('2. Toggle to "Test Mode" (top left)');
      console.log('3. Go to Settings → API Keys');
      console.log('4. Copy Test Key ID and Test Key Secret');
    } else {
      const order = await resp.json();
      console.log('✅ Success! Order created:', order);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testRazorpay();
