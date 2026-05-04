import axios from 'axios';

const registerTest = async () => {
  const url = 'http://localhost:5000/api/auth/register';
  const data = {
    name: 'Provider Three',
    email: 'provider3@gmail.com',
    phone: '910000000003',
    password: 'password123',
    role: 'PROVIDER',
    city: 'Vellore',
    area: 'Katpadi',
    providerProfile: JSON.stringify({
      serviceCategories: ['Electrician'],
      whatsappNumber: '910000000003',
      headline: 'Test Headline',
      startingPrice: '249'
    })
  };

  try {
    const res = await axios.post(url, data);
    console.log('Registration success:', res.data);
  } catch (err) {
    console.error('Registration failed:');
    console.error(err.response?.data || err.message);
  }
};

registerTest();
