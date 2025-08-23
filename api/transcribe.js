export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  res.json({ 
    message: 'transcribe endpoint erreicht',
    method: req.method
  });
}
